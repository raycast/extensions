import { Icon } from "@raycast/api";
import {
  audioDarkIcon,
  audioLightIcon,
  codeDarkIcon,
  codeLightIcon,
  documentDarkIcon,
  documentLightIcon,
  fileDarkIcon,
  fileLightIcon,
  folderDarkIcon,
  folderLightIcon,
  markdownDarkIcon,
  markdownLightIcon,
  pdfDarkIcon,
  pdfLightIcon,
  pictruesDarkIcon,
  pictruesLightIcon,
  svgDarkIcon,
  svgLightIcon,
  videoDarkIcon,
  videoLightIcon,
  zipDarkIcon,
  zipLightIcon,
} from "./constants";
import { FileItem, SortTypes } from "../types";
import { existsSync } from "fs";
import { join } from "path";
import { environment } from "@raycast/api";

// TODO: Fix image and markdown icons
export const getfileLightIcon = (fileName: string, type: string) => {
  if (type === "directory") return Icon.Folder;

  const ext = fileName.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
      return { source: { light: "dark/picture.svg", dark: "picture.svg" } };
    case "svg":
      return { source: { light: "dark/svg.svg", dark: "svg.svg" } };
    case "mp4":
    case "mov":
    case "avi":
    case "wmv":
    case "flv":
    case "mkv":
    case "webm":
    case "ogg":
    case "mpeg":
      return { source: { light: "dark/video.svg", dark: "video.svg" } };
    case "mp3":
    case "wav":
    case "flac":
      return { source: { light: "dark/audio.svg", dark: "audio.svg" } };
    case "zip":
    case "tar":
    case "gz":
      return { source: { light: "dark/zip.svg", dark: "zip.svg" } };
    case "pdf":
      return { source: { light: "dark/file-pdf.svg", dark: "file-pdf.svg" } };
    case "doc":
    case "docx":
    case "xls":
    case "xlsx":
    case "ppt":
    case "pptx":
      return { source: { light: "dark/document.svg", dark: "document.svg" } };
    case "md":
      return { source: { light: "dark/markdown.svg", dark: "markdown.svg" } };
    case "js":
    case "jsx":
    case "ts":
    case "tsx":
    case "py":
      return Icon.Code;
    default:
      return Icon.Document;
  }
};

export const getItemMarkdown = (fileName: string, type: string) => {
  if (type === "directory") {
    if (environment.appearance === "dark") {
      return folderLightIcon;
    } else {
      return folderDarkIcon;
    }
  }

  const ext = fileName.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
      if (environment.appearance === "dark") {
        return pictruesLightIcon;
      } else {
        return pictruesDarkIcon;
      }
    case "svg":
      if (environment.appearance === "dark") {
        return svgLightIcon;
      } else {
        return svgDarkIcon;
      }
    case "mp4":
    case "mov":
    case "avi":
    case "wmv":
    case "flv":
    case "mkv":
    case "webm":
    case "ogg":
    case "mpeg":
      if (environment.appearance === "dark") {
        return videoLightIcon;
      } else {
        return videoDarkIcon;
      }
    case "mp3":
    case "wav":
    case "flac":
      if (environment.appearance === "dark") {
        return audioLightIcon;
      } else {
        return audioDarkIcon;
      }
    case "zip":
    case "tar":
    case "gz":
      if (environment.appearance === "dark") {
        return zipLightIcon;
      } else {
        return zipDarkIcon;
      }
    case "pdf":
      if (environment.appearance === "dark") {
        return pdfLightIcon;
      } else {
        return pdfDarkIcon;
      }
    case "doc":
    case "docx":
    case "xls":
    case "xlsx":
    case "ppt":
    case "pptx":
      if (environment.appearance === "dark") {
        return documentLightIcon;
      } else {
        return documentDarkIcon;
      }
    case "md":
      if (environment.appearance === "dark") {
        return markdownLightIcon;
      } else {
        return markdownDarkIcon;
      }
    case "js":
    case "jsx":
    case "ts":
    case "tsx":
    case "py":
      if (environment.appearance === "dark") {
        return codeLightIcon;
      } else {
        return codeDarkIcon;
      }

    default:
      if (environment.appearance === "dark") {
        return fileLightIcon;
      } else {
        return fileDarkIcon;
      }
  }
};

export const sortFiles = (files: FileItem[], sortBy: SortTypes): FileItem[] => {
  const directories = files.filter((file) => file.type === "directory");
  const regularFiles = files.filter((file) => file.type === "file");

  const sortFunction = (a: FileItem, b: FileItem) => {
    switch (sortBy) {
      case SortTypes.NAME:
        return a.name.localeCompare(b.name, undefined, { numeric: true });
      case SortTypes.MODIFIED_TIME:
        return new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime();
      case SortTypes.SIZE:
        return (b.size ?? 0) - (a.size ?? 0);
      case SortTypes.KIND:
        const extA = a.name.split(".").pop()?.toLowerCase() || "";
        const extB = b.name.split(".").pop()?.toLowerCase() || "";
        return extA.localeCompare(extB);
      default:
        return 0;
    }
  };

  return [...directories.sort(sortFunction), ...regularFiles.sort(sortFunction)];
};

export const getUniqueFilename = (directory: string, filename: string): string => {
  const fullPath = join(directory, filename);

  if (!existsSync(fullPath)) {
    return filename;
  }

  const lastDotIndex = filename.lastIndexOf(".");

  let name: string;
  let ext: string;

  if (lastDotIndex === -1 || lastDotIndex === 0) {
    name = filename;
    ext = "";
  } else {
    name = filename.substring(0, lastDotIndex);
    ext = filename.substring(lastDotIndex);
  }

  let counter = 1;
  let newFilename = `${name}(${counter})${ext}`;
  let newFullPath = join(directory, newFilename);

  while (existsSync(newFullPath)) {
    counter++;
    newFilename = `${name}(${counter})${ext}`;
    newFullPath = join(directory, newFilename);
  }

  return newFilename;
};
