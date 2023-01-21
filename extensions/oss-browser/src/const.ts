export enum ACL {
  Default = "default",
  Private = "private",
  PublicRead = "public-read",
  PublicReadWrite = "public-read-write",
}

export enum FileType {
  Img = "img",
  Code = "code",
  Text = "text",
  MarkDown = "md",
  Video = "video",
  Audio = "audio",
  Unknown = "doc",
}

export const ImgExts = [".png", ".jpeg", ".jpg", ".svg", ".webp", ".gif"];

export const CodeExts = [
  ".go",
  ".js",
  ".ts",
  ".java",
  ".php",
  ".css",
  ".sql",
  ".html",
  ".json",
  ".swift",
  ".h",
  ".hpp",
  ".c",
  ".cpp",
  ".cs",
  ".vue",
  ".py",
  ".tsx",
  ".xml",
];
export const MdExt = ".md";

export const PlainTextExts = [".txt"];

export const AudioExts = [".mp3", ".flac", ".wav"];

export const VideoExts = [".mp4", ".avi", ".mov", ".flv"];

export enum RenameType {
  Original = "originalName",
  MD5 = "md5OfContent",
  WithDate = "namedWithDate",
}
