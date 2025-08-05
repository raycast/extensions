import {
  getDefaultApplication,
  getPreferenceValues,
  Icon,
  popToRoot,
  showInFinder,
  showToast,
  Toast,
  open,
  Cache,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import fs from "fs";
import path from "path";
const preferences = getPreferenceValues<Preferences>();
const cache = new Cache();

export type MarkdownFile = {
  path: string;
  headline?: string;
  name: string;
  pageCount: number;
  content: string;
  isPaginated: boolean;
  icon?: string;
  creationTime: Date;
};

export const PAGE_SEPARATOR = preferences.pageSeparator === "newline" ? "\n\n\n" : "---";
export const DEFAULT_PATH = `index.md`;
export const PLACEHOLDER_TEXT = "No Markdown slides found. Create a new markdown file at `";
export const PLACEHOLDER_DESCRIPTION = "`? \n\n> You can customize the slides directory in the extension settings";
export const PLACEHOLDER_CONTENT = `# New Presentation\n\nStart writing your slides here.\n${PAGE_SEPARATOR}\nNew Page`;

export function parseMarkdownToSlides(markdown: string): string[] {
  return markdown.split(PAGE_SEPARATOR).map((slide) => slide.trim());
}

export function getMarkdownFiles(directory: string): Array<MarkdownFile> {
  if (!fs.existsSync(directory)) {
    showToast({
      style: Toast.Style.Failure,
      title: "Directory not found",
      message: "Configured slides path: " + directory,
      primaryAction: {
        title: "Create Directory",
        onAction() {
          if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory, { recursive: true });
            showToast({ title: "Created slides directory" });
          }
        },
      },
    });
    return [];
  }
  const files = fs.readdirSync(directory);
  const markdownFiles = files.filter((file) => path.extname(file).toLowerCase() === ".md");
  const filesWithMetadata = markdownFiles.map((file) => {
    const filePath = path.join(directory, file);
    const fileStat = fs.statSync(filePath);
    const creationTime = fileStat.birthtime;
    let content = fs.readFileSync(filePath, "utf8");
    let isPaginated = false;
    let icon = "";
    if (content.startsWith("---")) {
      if (content.includes("paginate: true")) {
        isPaginated = true;
      }
      const iconMatch = content.match(/icon: (.+?)\n/);
      if (iconMatch && iconMatch[1]) {
        icon = iconMatch[1].trim();
      }
      const endOfFrontmatter = content.indexOf("---", 3);
      if (endOfFrontmatter !== -1) {
        content = content.slice(endOfFrontmatter + 3).trim();
      }
    }
    const firstLine = content
      .split("\n")
      .find((line) => line.startsWith("#") || line.startsWith("##") || line.startsWith("###"));
    const pageCount = content.split(PAGE_SEPARATOR).length;
    return {
      headline: firstLine ? firstLine.replaceAll("#", "").trim() : "",
      path: filePath,
      name: file,
      pageCount,
      isPaginated,
      content,
      icon,
      creationTime,
    };
  });
  return filesWithMetadata;
}

export function getIcon(name?: keyof typeof Icon) {
  if (!name) return Icon.Document;
  return Icon[name] || Icon.Warning;
}

export async function editFile(filePath: string, finder = false) {
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

export type CreateFormValues = {
  title: string;
  content: string;
  theme: string;
  paginate: boolean;
  icon?: keyof typeof Icon;
};

export function createSlidesFile(values: CreateFormValues) {
  const { title, theme, paginate } = values;
  let content = values.content;
  const fileName = `${title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.md`;
  const filePath = path.join(preferences.slidesDirectory.replace("~", process.env.HOME || ""), fileName);

  if (!content.startsWith("---")) {
    content = `---\nmarp:true\ntheme: ${theme}\npaginate: ${paginate ? "true" : "false"}\n---\n\n` + content;
  }

  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content);
    cache.set("selectedSlides", fileName);
    launchCommand({ name: "preview-markdown-slides", type: LaunchType.UserInitiated, context: { file: fileName } });
    showToast({ title: "Presentation created", message: `File saved as ${fileName}` });
  } catch (error) {
    console.error("Error writing file:", error);
    showToast({ title: "Error", message: "Failed to create presentation", style: Toast.Style.Failure });
  }
}
