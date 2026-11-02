import { html } from "htm/preact";

/** Tiny inline SVG icons — replaces lucide-react. */
function Icon({ children, size = 16, className, ...rest }) {
  return html`
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width=${size}
      height=${size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class=${className}
      ...${rest}
    >
      ${children}
    </svg>
  `;
}

export const Upload = (p) =>
  html`<${Icon} ...${p}
    ><path d="M12 3v12" /><path d="m17 8-5-5-5 5" /><path d="M5 21h14"
  /></${Icon}>`;

export const MessageSquareText = (p) =>
  html`<${Icon} ...${p}
    ><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><path
      d="M8 9h8"
    /><path d="M8 13h6"
  /></${Icon}>`;

export const ArrowDownToLine = (p) =>
  html`<${Icon} ...${p}
    ><path d="M12 17V3" /><path d="m6 11 6 6 6-6" /><path d="M19 21H5"
  /></${Icon}>`;

export const Search = (p) =>
  html`<${Icon} ...${p}
    ><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3"
  /></${Icon}>`;

export const RefreshCw = (p) =>
  html`<${Icon} ...${p}
    ><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path
      d="M21 3v5h-5"
    /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path
      d="M8 16H3v5"
  /></${Icon}>`;

export const ListX = (p) =>
  html`<${Icon} ...${p}
    ><path d="M11 12H3" /><path d="M16 6H3" /><path d="M16 18H3" /><path
      d="m19 10-4 4"
    /><path d="m15 10 4 4"
  /></${Icon}>`;

export const Trash2 = (p) =>
  html`<${Icon} ...${p}
    ><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path
      d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"
    /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17"
  /></${Icon}>`;

export const CloudUpload = (p) =>
  html`<${Icon} ...${p}
    ><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" /><path
      d="M12 12v9"
    /><path d="m16 16-4-4-4 4"
  /></${Icon}>`;

export const ArrowUp = (p) =>
  html`<${Icon} ...${p}><path d="m5 12 7-7 7 7" /><path d="M12 19V5" /></${Icon}>`;

export const RotateCw = (p) =>
  html`<${Icon} ...${p}
    ><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /><path
      d="M21 3v5h-5"
  /></${Icon}>`;

export const X = (p) =>
  html`<${Icon} ...${p}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></${Icon}>`;

export const Check = (p) =>
  html`<${Icon} ...${p}><path d="M20 6 9 17l-5-5" /></${Icon}>`;

export const Minus = (p) => html`<${Icon} ...${p}><path d="M5 12h14" /></${Icon}>`;

export const Monitor = (p) =>
  html`<${Icon} ...${p}
    ><rect width="20" height="14" x="2" y="3" rx="2" /><path d="M8 21h8" /><path
      d="M12 17v4"
  /></${Icon}>`;

export const Sun = (p) =>
  html`<${Icon} ...${p}
    ><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path
      d="m4.93 4.93 1.41 1.41"
    /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path
      d="m6.34 17.66-1.41 1.41"
    /><path d="m19.07 4.93-1.41 1.41"
  /></${Icon}>`;

export const Moon = (p) =>
  html`<${Icon} ...${p}
    ><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"
  /></${Icon}>`;

export const CheckCircle2 = (p) =>
  html`<${Icon} ...${p}
    ><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4"
  /></${Icon}>`;

export const Info = (p) =>
  html`<${Icon} ...${p}
    ><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01"
  /></${Icon}>`;

export const XCircle = (p) =>
  html`<${Icon} ...${p}
    ><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6"
  /></${Icon}>`;

export const Folder = (p) =>
  html`<${Icon} ...${p}
    ><path
      d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9l-.81-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"
  />
  </${Icon}>`;

export const File = (p) =>
  html`<${Icon} ...${p}
    ><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path
      d="M14 2v4a2 2 0 0 0 2 2h4"
  /></${Icon}>`;

export const FileText = (p) =>
  html`<${Icon} ...${p}
    ><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path
      d="M14 2v4a2 2 0 0 0 2 2h4"
    /><path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8"
  /></${Icon}>`;

export const FileImage = (p) =>
  html`<${Icon} ...${p}
    ><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path
      d="M14 2v4a2 2 0 0 0 2 2h4"
    /><circle cx="10" cy="12" r="2" /><path d="m20 17-1.09-1.09a2 2 0 0 0-2.82 0L10 22"
  /></${Icon}>`;

export const FileVideo = (p) =>
  html`<${Icon} ...${p}
    ><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path
      d="M14 2v4a2 2 0 0 0 2 2h4"
    /><path d="m10 11 5 3-5 3v-6Z"
  /></${Icon}>`;

export const FileAudio = (p) =>
  html`<${Icon} ...${p}
    ><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path
      d="M14 2v4a2 2 0 0 0 2 2h4"
    /><path d="M8 15h.01" /><path d="M11.5 13.5a2.5 2.5 0 0 1 0 3" /><path
      d="M15 12a5 5 0 0 1 0 6"
  /></${Icon}>`;

export const FileType = (p) =>
  html`<${Icon} ...${p}
    ><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path
      d="M14 2v4a2 2 0 0 0 2 2h4"
    /><path d="M9 13v-1h6v1" /><path d="M12 12v6" /><path d="M11 18h2"
  /></${Icon}>`;

export const FileSpreadsheet = (p) =>
  html`<${Icon} ...${p}
    ><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path
      d="M14 2v4a2 2 0 0 0 2 2h4"
    /><path d="M8 13h2" /><path d="M14 13h2" /><path d="M8 17h2" /><path d="M14 17h2"
  /></${Icon}>`;

export const Presentation = (p) =>
  html`<${Icon} ...${p}
    ><path d="M2 3h20" /><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3" /><path
      d="m7 21 5-5 5 5"
  /></${Icon}>`;

export const FileCode = (p) =>
  html`<${Icon} ...${p}
    ><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path
      d="M14 2v4a2 2 0 0 0 2 2h4"
    /><path d="m10 13-2 2 2 2" /><path d="m14 17 2-2-2-2"
  /></${Icon}>`;

export const FileArchive = (p) =>
  html`<${Icon} ...${p}
    ><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path
      d="M14 2v4a2 2 0 0 0 2 2h4"
    /><path d="M10 12v-1h4v1" /><path d="M10 16v-1h4v1" /><path d="M10 8v-1h4v1"
  /></${Icon}>`;

const GROUPS = [
  {
    Icon: FileImage,
    tone: "text-violet-600 dark:text-violet-400",
    extensions: [
      "png",
      "jpg",
      "jpeg",
      "gif",
      "webp",
      "svg",
      "bmp",
      "heic",
      "avif",
      "tiff",
      "tif",
      "ico",
      "psd",
    ],
  },
  {
    Icon: FileVideo,
    tone: "text-rose-600 dark:text-rose-400",
    extensions: ["mp4", "webm", "mov", "m4v", "ogv", "avi", "mkv", "flv", "wmv", "mpeg", "mpg"],
  },
  {
    Icon: FileAudio,
    tone: "text-amber-600 dark:text-amber-400",
    extensions: ["mp3", "m4a", "wav", "ogg", "oga", "aac", "flac", "aiff", "opus"],
  },
  {
    Icon: FileType,
    tone: "text-red-600 dark:text-red-400",
    extensions: ["pdf"],
  },
  {
    Icon: FileSpreadsheet,
    tone: "text-blue-600 dark:text-blue-400",
    extensions: ["xls", "xlsx", "xlsm", "csv", "tsv", "numbers", "ods"],
  },
  {
    Icon: Presentation,
    tone: "text-orange-600 dark:text-orange-400",
    extensions: ["ppt", "pptx", "key", "odp"],
  },
  {
    Icon: FileCode,
    tone: "text-cyan-700 dark:text-cyan-400",
    extensions: [
      "js",
      "jsx",
      "mjs",
      "cjs",
      "ts",
      "tsx",
      "json",
      "json5",
      "py",
      "pyi",
      "rb",
      "go",
      "rs",
      "java",
      "kt",
      "swift",
      "c",
      "h",
      "cc",
      "cpp",
      "hpp",
      "cs",
      "php",
      "sh",
      "bash",
      "zsh",
      "fish",
      "sql",
      "html",
      "htm",
      "css",
      "scss",
      "sass",
      "less",
      "vue",
      "svelte",
      "yml",
      "yaml",
      "toml",
      "ini",
      "xml",
      "gradle",
      "lua",
      "pl",
    ],
  },
  {
    Icon: FileArchive,
    tone: "text-yellow-700 dark:text-yellow-500",
    extensions: ["zip", "rar", "7z", "tar", "gz", "tgz", "bz2", "xz", "dmg", "iso"],
  },
  {
    Icon: FileText,
    tone: "text-slate-500 dark:text-slate-400",
    extensions: ["txt", "md", "markdown", "log", "rtf", "doc", "docx", "pages", "odt"],
  },
];

const FALLBACK = { Icon: File, tone: "text-muted" };
const FOLDER = { Icon: Folder, tone: "text-accent" };
const SHARED_TEXT = { Icon: MessageSquareText, tone: "text-accent" };

export function fileVisual(kind, name) {
  if (kind === "directory") return FOLDER;
  if (kind === "text") return SHARED_TEXT;
  const dot = name.lastIndexOf(".");
  const extension = dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
  const group = GROUPS.find((item) => item.extensions.includes(extension));
  return group ? { Icon: group.Icon, tone: group.tone } : FALLBACK;
}
