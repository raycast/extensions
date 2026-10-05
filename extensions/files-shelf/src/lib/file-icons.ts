import { Icon } from "@raycast/api";
import { extname } from "path";
import { ShelfItem } from "./types";

const designExtensions = new Set(["ai", "psd", "sketch", "fig", "xd", "svg", "eps", "indd"]);
const imageExtensions = new Set(["png", "jpg", "jpeg", "gif", "webp", "ico", "bmp", "tiff", "heic", "raw"]);
const videoExtensions = new Set(["mp4", "mov", "avi", "mkv", "webm", "flv", "wmv", "m4v"]);
const audioExtensions = new Set(["mp3", "wav", "flac", "aac", "ogg", "m4a", "wma"]);
const documentExtensions = new Set(["pdf"]);
const textDocExtensions = new Set(["doc", "docx", "odt", "rtf"]);
const spreadsheetExtensions = new Set(["xls", "xlsx", "csv", "ods"]);
const presentationExtensions = new Set(["ppt", "pptx", "odp", "key"]);
const archiveExtensions = new Set(["zip", "rar", "7z", "tar", "gz", "bz2", "xz", "dmg"]);
const codeExtensions = new Set([
  "js",
  "ts",
  "jsx",
  "tsx",
  "py",
  "rb",
  "go",
  "rs",
  "java",
  "c",
  "cpp",
  "h",
  "swift",
  "kt",
  "php",
  "sh",
  "bash",
  "zsh",
]);
const dataExtensions = new Set(["json", "yaml", "yml", "xml", "toml", "ini", "env"]);
const textExtensions = new Set(["md", "txt", "log", "readme"]);

export function getFileIcon(item: ShelfItem): Icon {
  if (item.type === "folder") {
    return Icon.Folder;
  }

  const ext = extname(item.name).toLowerCase().slice(1); // Remove the dot

  if (designExtensions.has(ext)) return Icon.Brush;
  if (imageExtensions.has(ext)) return Icon.Image;
  if (videoExtensions.has(ext)) return Icon.FilmStrip;
  if (audioExtensions.has(ext)) return Icon.Music;
  if (documentExtensions.has(ext)) return Icon.Book;
  if (textDocExtensions.has(ext)) return Icon.Text;
  if (spreadsheetExtensions.has(ext)) return Icon.BarChart;
  if (presentationExtensions.has(ext)) return Icon.Megaphone;
  if (archiveExtensions.has(ext)) return Icon.Box;
  if (codeExtensions.has(ext)) return Icon.Code;
  if (dataExtensions.has(ext)) return Icon.CodeBlock;
  if (textExtensions.has(ext)) return Icon.Text;

  return Icon.Document;
}

export function getFileCategory(item: ShelfItem): string {
  if (item.type === "folder") return "Folder";

  const ext = extname(item.name).toLowerCase().slice(1);

  if (designExtensions.has(ext)) return "Design";
  if (imageExtensions.has(ext)) return "Image";
  if (videoExtensions.has(ext)) return "Video";
  if (audioExtensions.has(ext)) return "Audio";
  if (documentExtensions.has(ext)) return "PDF";
  if (textDocExtensions.has(ext)) return "Document";
  if (spreadsheetExtensions.has(ext)) return "Spreadsheet";
  if (presentationExtensions.has(ext)) return "Presentation";
  if (archiveExtensions.has(ext)) return "Archive";
  if (codeExtensions.has(ext)) return "Code";
  if (dataExtensions.has(ext)) return "Data";
  if (textExtensions.has(ext)) return "Text";

  return "Other";
}

export function getFileExtension(item: ShelfItem): string {
  if (item.type === "folder") return "folder";
  const ext = extname(item.name).toLowerCase().slice(1);
  return ext || "unknown";
}

export function getCategoryIcon(category: string): Icon {
  switch (category) {
    case "Folder":
      return Icon.Folder;
    case "Design":
      return Icon.Brush;
    case "Image":
      return Icon.Image;
    case "Video":
      return Icon.FilmStrip;
    case "Audio":
      return Icon.Music;
    case "PDF":
      return Icon.Book;
    case "Document":
      return Icon.Text;
    case "Spreadsheet":
      return Icon.BarChart;
    case "Presentation":
      return Icon.Megaphone;
    case "Archive":
      return Icon.Box;
    case "Code":
      return Icon.Code;
    case "Data":
      return Icon.CodeBlock;
    case "Text":
      return Icon.Text;
    default:
      return Icon.Document;
  }
}
