import { Icon } from "@raycast/api";

const MODULE_ICONS: Record<string, Icon> = {
  folder: Icon.Folder,
  resource: Icon.Document,
  url: Icon.Link,
  forum: Icon.SpeechBubble,
  page: Icon.Text,
  assign: Icon.Pencil,
  quiz: Icon.QuestionMarkCircle,
  label: Icon.Info,
  lti: Icon.Globe,
  book: Icon.Book,
  choice: Icon.Checkmark,
  feedback: Icon.Message,
  workshop: Icon.TwoPeople,
  wiki: Icon.Paragraph,
  glossary: Icon.List,
  chat: Icon.Bubble,
  lesson: Icon.Bookmark,
  scorm: Icon.Play,
  h5pactivity: Icon.Play,
  data: Icon.Coins,
};

export function moduleIcon(modname: string): Icon {
  return MODULE_ICONS[modname] ?? Icon.Circle;
}

export function fileIcon(name: string, mimetype?: string): Icon {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const mime = mimetype ?? "";
  if (mime.startsWith("image/")) return Icon.Image;
  if (mime.startsWith("video/")) return Icon.Video;
  if (mime.startsWith("audio/")) return Icon.Music;
  if (ext === "pdf") return Icon.Document;
  if (["zip", "rar", "7z", "gz", "tar", "tgz"].includes(ext)) return Icon.Box;
  if (["ppt", "pptx", "key", "odp"].includes(ext)) return Icon.Window;
  if (["xls", "xlsx", "csv", "ods", "numbers"].includes(ext)) return Icon.BarChart;
  if (["doc", "docx", "odt", "rtf", "pages"].includes(ext)) return Icon.Text;
  if (
    ["c", "cpp", "h", "java", "py", "js", "ts", "sql", "sh", "txt", "md", "json", "xml", "yaml", "yml"].includes(ext)
  ) {
    return Icon.Code;
  }
  return Icon.Document;
}
