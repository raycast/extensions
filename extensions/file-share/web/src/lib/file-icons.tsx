import {
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileType,
  FileVideo,
  Folder,
  MessageSquareText,
  Presentation,
  type LucideIcon,
} from "lucide-react";

export type RowKind = "file" | "directory" | "text";

type Visual = { Icon: LucideIcon; tone: string };

/** One icon family for every row, tinted per type so a glance is enough to tell a video from a zip. */
const GROUPS: Array<{ visual: Visual; extensions: string[] }> = [
  {
    visual: { Icon: FileImage, tone: "text-violet-600 dark:text-violet-400" },
    extensions: ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "heic", "avif", "tiff", "tif", "ico", "psd"],
  },
  {
    visual: { Icon: FileVideo, tone: "text-rose-600 dark:text-rose-400" },
    extensions: ["mp4", "webm", "mov", "m4v", "ogv", "avi", "mkv", "flv", "wmv", "mpeg", "mpg"],
  },
  {
    visual: { Icon: FileAudio, tone: "text-amber-600 dark:text-amber-400" },
    extensions: ["mp3", "m4a", "wav", "ogg", "oga", "aac", "flac", "aiff", "opus"],
  },
  {
    visual: { Icon: FileType, tone: "text-red-600 dark:text-red-400" },
    extensions: ["pdf"],
  },
  {
    visual: { Icon: FileSpreadsheet, tone: "text-blue-600 dark:text-blue-400" },
    extensions: ["xls", "xlsx", "xlsm", "csv", "tsv", "numbers", "ods"],
  },
  {
    visual: { Icon: Presentation, tone: "text-orange-600 dark:text-orange-400" },
    extensions: ["ppt", "pptx", "key", "odp"],
  },
  {
    visual: { Icon: FileCode, tone: "text-cyan-700 dark:text-cyan-400" },
    extensions: [
      "js", "jsx", "mjs", "cjs", "ts", "tsx", "json", "json5", "py", "pyi", "rb", "go", "rs", "java", "kt",
      "swift", "c", "h", "cc", "cpp", "hpp", "cs", "php", "sh", "bash", "zsh", "fish", "sql", "html", "htm",
      "css", "scss", "sass", "less", "vue", "svelte", "yml", "yaml", "toml", "ini", "xml", "gradle", "lua", "pl",
    ],
  },
  {
    visual: { Icon: FileArchive, tone: "text-yellow-700 dark:text-yellow-500" },
    extensions: ["zip", "rar", "7z", "tar", "gz", "tgz", "bz2", "xz", "dmg", "iso"],
  },
  {
    visual: { Icon: FileText, tone: "text-slate-500 dark:text-slate-400" },
    extensions: ["txt", "md", "markdown", "log", "rtf", "doc", "docx", "pages", "odt"],
  },
];

const FALLBACK: Visual = { Icon: File, tone: "text-muted" };
const FOLDER: Visual = { Icon: Folder, tone: "text-accent" };
const SHARED_TEXT: Visual = { Icon: MessageSquareText, tone: "text-accent" };

export function fileVisual(kind: RowKind, name: string): Visual {
  if (kind === "directory") return FOLDER;
  if (kind === "text") return SHARED_TEXT;
  const dot = name.lastIndexOf(".");
  const extension = dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
  return GROUPS.find((group) => group.extensions.includes(extension))?.visual ?? FALLBACK;
}
