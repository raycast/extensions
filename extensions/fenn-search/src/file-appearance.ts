import { Color, Icon, Image } from "@raycast/api";
import { extname } from "node:path";
import type { SearchResult } from "./search-model";

type FileAppearance = { label: string; icon: Image.ImageLike };

const appearance = (label: string, source: Icon, tintColor: Color.ColorLike): FileAppearance => ({
  label,
  icon: { source, tintColor },
});

// Share the same visual language between search results and filter choices.
const FILE_APPEARANCES: Record<string, FileAppearance> = {
  pdf: appearance("PDF", Icon.Document, Color.Red),
  docx: appearance("Word Document", Icon.Paragraph, Color.Blue),
  pages: { label: "Pages Document", icon: "file-types/pages.png" },
  powerpoint: appearance("Presentation", Icon.BarChart, Color.Orange),
  sheets: appearance("Spreadsheet", Icon.AppWindowGrid3x3, Color.Green),
  csv: appearance("CSV", Icon.List, { light: "#0F766E", dark: "#2DD4BF" }),
  images: appearance("Image", Icon.Image, Color.Green),
  videos: appearance("Video", Icon.FilmStrip, Color.Purple),
  audio: appearance("Audio", Icon.Music, Color.Magenta),
  email: appearance("Email", Icon.Envelope, Color.Blue),
  code: appearance("Code", Icon.Code, Color.Purple),
  psd: appearance("Photoshop", Icon.Brush, Color.Blue),
  ai: appearance("Illustrator", Icon.Pencil, Color.Orange),
  indd: appearance("InDesign", Icon.AppWindowSidebarLeft, Color.Magenta),
  fig: appearance("Figma", Icon.Layers, Color.Purple),
  sketch: appearance("Sketch", Icon.Stars, Color.Yellow),
  ebook: appearance("eBook", Icon.Book, Color.Purple),
  notes: { label: "Apple Notes", icon: "file-types/apple-notes.png" },
  craft: { label: "Craft", icon: "file-types/craft.png" },
  bear: { label: "Bear", icon: "file-types/bear.png" },
  notion: { label: "Notion", icon: "file-types/notion.png" },
  text: appearance("Text Document", Icon.Text, Color.SecondaryText),
  markdown: appearance("Markdown", Icon.Text, Color.Blue),
  web: appearance("Web Archive", Icon.Globe, Color.Blue),
  document: appearance("Document", Icon.Document, Color.SecondaryText),
};

const EXTENSIONS: Record<string, string[]> = {
  pdf: ["pdf"],
  docx: ["doc", "docx", "odt", "rtf"],
  pages: ["pages"],
  powerpoint: ["ppt", "pptx", "key", "odp"],
  sheets: ["xls", "xlsx", "ods", "numbers"],
  csv: ["csv", "tsv"],
  images: [
    "jpg",
    "jpeg",
    "png",
    "gif",
    "bmp",
    "tiff",
    "tif",
    "webp",
    "svg",
    "heic",
    "heif",
    "avif",
    "cr2",
    "nef",
    "raf",
    "dng",
    "arw",
    "rw2",
    "orf",
  ],
  videos: ["mp4", "mov", "avi", "mkv", "wmv", "m4v", "mxf", "mts"],
  audio: ["mp3", "wav", "flac", "aac", "aiff", "ogg", "m4a"],
  email: ["olk15msgsource", "eml", "emlx", "mbox"],
  code: [
    "py",
    "js",
    "jsx",
    "ts",
    "tsx",
    "html",
    "ipynb",
    "java",
    "c",
    "h",
    "hpp",
    "rb",
    "cpp",
    "php",
    "go",
    "swift",
    "kt",
    "scala",
    "r",
    "sql",
    "css",
    "scss",
    "sass",
    "less",
    "json",
    "xml",
    "yaml",
    "yml",
    "toml",
    "ini",
    "cfg",
    "conf",
    "sh",
    "bash",
    "zsh",
    "ps1",
    "bat",
    "cmd",
    "rs",
    "vue",
    "svelte",
  ],
  psd: ["psd"],
  ai: ["ai"],
  indd: ["indd"],
  fig: ["fig"],
  sketch: ["sketch"],
  ebook: ["epub", "mobi"],
  notes: ["notes"],
  craft: ["craft"],
  bear: ["bear"],
  notion: ["notion"],
  text: ["txt", "log", "rst"],
  markdown: ["md", "markdown"],
  web: ["webarchive"],
};

const TYPE_BY_EXTENSION = new Map(
  Object.entries(EXTENSIONS).flatMap(([type, extensions]) => extensions.map((extension) => [extension, type] as const)),
);

export function fileTypeAppearance(type: string): FileAppearance {
  return FILE_APPEARANCES[type] ?? FILE_APPEARANCES.document;
}

export function resultAppearance(result: SearchResult): FileAppearance {
  // Filename search can omit file_type. Prefer original format metadata, then
  // the original path/name; never use the generated PDF/thumbnail's extension.
  const extensions = [result.file_extension, extname(result.original_file), extname(result.filename)];
  for (const candidate of extensions) {
    const extension = candidate?.trim().toLowerCase().replace(/^\./, "");
    const type = extension && TYPE_BY_EXTENSION.get(extension);
    if (type) {
      const visual = fileTypeAppearance(type);
      if (extension === "xls" || extension === "xlsx") return { ...visual, label: "Excel Spreadsheet" };
      if (extension === "key") return { ...visual, label: "Keynote Presentation" };
      return visual;
    }
  }
  const fallbackType: Record<string, string> = {
    image: "images",
    video: "videos",
    note: "notes",
  };
  return fileTypeAppearance(fallbackType[result.file_type ?? ""] ?? result.file_type ?? "document");
}
