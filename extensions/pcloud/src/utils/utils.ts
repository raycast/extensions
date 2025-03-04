import { Icon } from "@raycast/api";

export const FILE_SIZE_UNITS = ["B", "KB", "MB", "GB", "TB"];

export const getIconForFile = (fileName: string, isFolder: boolean) => {
  if (isFolder) {
    return Icon["Folder"];
  }
  if (!fileName) {
    return Icon["QuestionMark"];
  }
  switch (fileName.split(".").pop()) {
    case "pdf":
      return Icon["Document"];
    case "png":
    case "jpg":
    case "jpeg":
      return Icon["Image"];
    case "mp4":
    case "mkv":
    case "avi":
      return Icon["Video"];
    case "mp3":
    case "wav":
    case "flac":
    case "ogg":
      return Icon["Music"];
    case "zip":
    case "rar":
    case "tar.gz":
    case "tar":
    case "7z":
    case "gz":
      return Icon["Paperclip"];
    case "txt":
    case "doc":
    case "docx":
      return Icon["Paragraph"];
    default:
      return Icon["QuestionMark"];
  }
};

export const getTagForFile = (fileName: string, isFolder: boolean) => {
  if (isFolder) {
    return "Folder";
  }
  const extension = fileName.split(".").pop();
  switch (extension) {
    case "pdf":
      return "PDF";
    case "png":
    case "jpg":
    case "jpeg":
      return "Image";
    case "mp4":
    case "mkv":
    case "avi":
      return "Video";
    case "mp3":
    case "wav":
    case "flac":
    case "ogg":
      return "Music";
    case "zip":
    case "rar":
    case "tar.gz":
    case "tar":
    case "7z":
    case "gz":
      return "Archive";
    case "txt":
    case "doc":
    case "docx":
      return "Document";
    default:
      return "Unknown";
  }
};

export const formatBytes = (sizeInBytes = 0): string => {
  let unitIndex = 0;

  let computingSize = sizeInBytes;
  while (computingSize >= 1024) {
    computingSize /= 1024;
    unitIndex++;
  }
  return `${computingSize.toFixed(1)} ${FILE_SIZE_UNITS[unitIndex]}`;
};

export function isNotNullOrUndefined(v: unknown): v is NonNullable<typeof v> {
  return v !== null && v !== undefined;
}
