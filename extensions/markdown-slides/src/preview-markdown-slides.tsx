import {
  Action,
  ActionPanel,
  Cache,
  Detail,
  getDefaultApplication,
  getPreferenceValues,
  Icon,
  launchCommand,
  LaunchType,
  open,
  popToRoot,
  showInFinder,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import fs from "fs";
import { Marp } from "@marp-team/marp-core";

interface Preferences {
  slidesDirectory: string;
  pageSeparator: string;
}
const preferences = getPreferenceValues<Preferences>();
const cache = new Cache();

const DEFAULT_PATH = `index.md`;
const PAGE_SEPARATOR = preferences.pageSeparator === "newline" ? "\n\n\n" : "---";
const PLACEHOLDER_TEXT = "No Markdown slides found. Create a new markdown file at `";
const PLACEHOLDER_DESCRIPTION = "`? \n\n> You can customize the slides directory in the extension settings";
const PLACEHOLDER_CONTENT = `# New Presentation\n\nStart writing your slides here.\n${PAGE_SEPARATOR}\nNew Page`;

async function editFile(filePath: string, finder = false) {
  const dir = preferences.slidesDirectory?.replace("~", process.env.HOME || "");
  if (!fs.existsSync(filePath)) {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath.replace("~", process.env.HOME || ""), PLACEHOLDER_CONTENT);
    } catch (error) {
      console.error("Error writing file:", error);
      return;
    }
  }

  if (finder) {
    showInFinder(filePath);
  } else {
    const application = await getDefaultApplication(filePath);
    open(filePath, application);
  }
  popToRoot();
}

function parseMarkdownToSlides(markdown: string): string[] {
  return markdown.split(PAGE_SEPARATOR).map((slide) => slide.trim());
}

interface SlideProps {
  slide: string;
  slides: string[];
  filePath: string;
  nextSlide: (skip?: boolean) => void;
  prevSlide: (skip?: boolean) => void;
}

function generateHtmlSlides(markdown: string): string {
  const marp = new Marp({
    html: true,
    markdown: {
      breaks: true,
    },
  });

  const { html, css } = marp.render(markdown);

  return `
<!DOCTYPE html>
<html>
<head>
  <style>${css}</style>
</head>
<body>
  ${html}
</body>
</html>
  `;
}

function saveAndOpenHtml(html: string, filePath: string) {
  const htmlPath = filePath.replace(".md", ".html");
  fs.writeFileSync(htmlPath, html);
  open(htmlPath);
}

function Slide({ slide, slides, nextSlide, prevSlide, filePath }: SlideProps) {
  return (
    <Detail
      markdown={slide}
      actions={
        <ActionPanel>
          {!slide.includes(PLACEHOLDER_TEXT) && slides.length > 1 && (
            <ActionPanel.Section title="Navigate">
              <Action
                title="Next"
                icon={Icon.ArrowRight}
                shortcut={{ modifiers: [], key: "arrowRight" }}
                onAction={() => nextSlide()}
              />
              <Action
                title="Previous"
                icon={Icon.ArrowLeft}
                shortcut={{ modifiers: [], key: "arrowLeft" }}
                onAction={() => prevSlide()}
              />
              <Action
                title="Beginning"
                icon={Icon.ArrowLeftCircle}
                shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
                onAction={() => prevSlide(true)}
              />
              <Action
                title="End"
                icon={Icon.ArrowRightCircle}
                shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
                onAction={() => nextSlide(true)}
              />
            </ActionPanel.Section>
          )}
          <Action
            title={!slide.includes(PLACEHOLDER_TEXT) ? "Edit" : "Create"}
            icon={Icon.Pencil}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
            onAction={() => editFile(filePath)}
          />
          <Action.ShowInFinder path={filePath} />
          <Action.OpenWith path={filePath} />
          <Action
            title="Select File"
            icon={Icon.Folder}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
            onAction={() => launchCommand({ name: "select-markdown-presentation", type: LaunchType.UserInitiated })}
          />
          <Action
            title="Open in Browser"
            icon={Icon.Globe}
            shortcut={{ modifiers: ["cmd"], key: "b" }}
            onAction={() => {
              const html = generateHtmlSlides(fs.readFileSync(filePath, "utf-8"));
              saveAndOpenHtml(html, filePath);
            }}
          />
        </ActionPanel>
      }
    />
  );
}

export default function Command({ launchContext }: { launchContext: { file?: string } }) {
  const selectedFilePath =
    preferences.slidesDirectory + "/" + (launchContext?.file || cache.get("selectedSlides") || DEFAULT_PATH);
  const [markdown, setMarkdown] = useState<string | null>("");
  const [showPagination, setShowPagination] = useState(false);
  const [slides, setSlides] = useState<string[]>([""]);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    try {
      let markdownContent = fs.readFileSync(selectedFilePath, "utf-8");
      // Strip potential frontmatter
      if (markdownContent.startsWith("---")) {
        if (markdownContent.includes("paginate: true")) {
          setShowPagination(true);
        }
        const endOfFrontmatter = markdownContent.indexOf("---", 3);
        if (endOfFrontmatter !== -1) {
          markdownContent = markdownContent.slice(endOfFrontmatter + 3).trim();
        }
      }
      console.log(markdownContent);
      setMarkdown(markdownContent);
    } catch (error) {
      console.log(error);
      showToast({
        style: Toast.Style.Failure,
        title: "File not found",
        message: "Tried to open file at: " + selectedFilePath,
      });
      setMarkdown(null);
    }
  }, [selectedFilePath]);

  useEffect(() => {
    if (markdown) {
      const parsedSlides = parseMarkdownToSlides(markdown);
      console.log(parsedSlides);
      setSlides(parsedSlides);
    } else if (markdown === null) setSlides([PLACEHOLDER_TEXT + selectedFilePath + PLACEHOLDER_DESCRIPTION]);
  }, [markdown]);

  useEffect(() => {
    if (showPagination) {
      const pageNumber = currentSlide + 1;
      showToast({
        title: "Slide " + pageNumber + "/" + slides.length,
      });
    }
  }, [currentSlide]);

  const nextSlide = (skip = false) => {
    if (skip) {
      setCurrentSlide(slides.length - 1);
    } else if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = (skip = false) => {
    if (skip) {
      setCurrentSlide(0);
    } else if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  return (
    <Slide
      slide={slides[currentSlide]}
      slides={slides}
      nextSlide={nextSlide}
      prevSlide={prevSlide}
      filePath={selectedFilePath}
    />
  );
}
