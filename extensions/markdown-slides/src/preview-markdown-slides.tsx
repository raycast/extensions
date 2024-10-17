import { Action, ActionPanel, Cache, Detail, getPreferenceValues, Icon, launchCommand, LaunchType, open, showInFinder, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import fs from 'fs';
import { Marp } from '@marp-team/marp-core';

interface Preferences {
  slidesDirectory: string;
  pageSeparator: string;
}
const preferences = getPreferenceValues<Preferences>();
const cache = new Cache();

const DEFAULT_PATH = `index.md`
const PAGE_SEPARATOR = preferences.pageSeparator;
const PLACEHOLDER_TEXT = 'No Markdown slides found. Create a new markdown file at '

function editFile(filePath: string, finder = false) {
  const dir = preferences.slidesDirectory?.replace('~', process.env.HOME || '');
  if (dir && !fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (error) {
      console.error("Error creating directory:", error);
      return;
    }
  }

  if (!fs.existsSync(filePath)) {
    try {
      fs.writeFileSync(filePath, "# New Presentation\n\nStart writing your slides here.\n\n---\n\nNew Page");
    } catch (error) {
      console.error("Error writing file:", error);
      return;
    }
  }

  if (finder) {
    showInFinder(filePath);
  } else {
    open(filePath);
  }
}

function parseMarkdownToSlides(markdown: string): string[] {
  return markdown.split(PAGE_SEPARATOR).map((slide) => slide.trim());
}

interface SlideProps {
  slide: string;
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
  
  const { html, css } = marp.render(markdown)

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
  const htmlPath = filePath.replace('.md', '.html');
  fs.writeFileSync(htmlPath, html);
  open(htmlPath);
}

function Slide({ slide, nextSlide, prevSlide, filePath }: SlideProps) {
  return (
    <Detail
      markdown={slide}
      actions={
        <ActionPanel>
          {!slide.includes(PLACEHOLDER_TEXT) && (
            <ActionPanel.Section title="Navigate">
              <Action title="Next" icon={Icon.ArrowRight} shortcut={{ modifiers: [], key: "arrowRight" }} onAction={() => nextSlide()} />
              <Action title="Previous" icon={Icon.ArrowLeft} shortcut={{ modifiers: [], key: "arrowLeft" }} onAction={() => prevSlide()} />
              <Action title="Beginning" icon={Icon.ArrowLeftCircle} shortcut={{ modifiers: ['cmd'], key: "arrowLeft" }} onAction={() => prevSlide(true)} />
              <Action title="End" icon={Icon.ArrowRightCircle} shortcut={{ modifiers: ['cmd'], key: "arrowRight" }} onAction={() => nextSlide(true)} />
            </ActionPanel.Section>
          )}
          <Action title="Edit" icon={Icon.Pencil} shortcut={{ modifiers: ['cmd'], key: "e" }} onAction={() => editFile(filePath)} />
          <Action.ShowInFinder path={filePath} />
          <Action.OpenWith path={filePath} />
          <Action title="Select File" icon={Icon.Folder} shortcut={{ modifiers: ['cmd'], key: "f" }} onAction={() => launchCommand({ name: "select-markdown-presentation", type: LaunchType.UserInitiated })} />
          <Action 
            title="Open in Browser" 
            icon={Icon.Globe} 
            shortcut={{ modifiers: ['cmd'], key: "b" }} 
            onAction={() => {
              const html = generateHtmlSlides(fs.readFileSync(filePath, 'utf-8'));
              saveAndOpenHtml(html, filePath);
            }} 
          />
        </ActionPanel>
      }
    />
  );
}

export default function Command({ launchContext }: { launchContext: { file?: string }}) {
  const selectedFilePath = preferences.slidesDirectory + '/' + (launchContext?.file || cache.get("selectedSlides") || DEFAULT_PATH)
  let markdown =  PLACEHOLDER_TEXT + selectedFilePath;
  try {
    markdown = fs.readFileSync(selectedFilePath, "utf-8")
    // Strip potential frontmatter
    if (markdown.startsWith("---")) {
      const endOfFrontmatter = markdown.indexOf("---", 3);
      if (endOfFrontmatter !== -1) {
        markdown = markdown.slice(endOfFrontmatter + 3).trim();
      }
    }
  } catch (error) {
    console.log(error)
  }
  const slides = parseMarkdownToSlides(markdown);
  const [currentSlide, setCurrentSlide] = useState(0);

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

  return <Slide 
    slide={slides[currentSlide]} 
    nextSlide={nextSlide} 
    prevSlide={prevSlide} 
    filePath={selectedFilePath} 
  />;
}