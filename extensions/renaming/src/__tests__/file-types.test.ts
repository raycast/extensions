import { describe, it, expect, vi } from "vitest";

vi.mock("../lib/os-capabilities", () => ({
  isPreviewableImage: (ext: string) => {
    const PREVIEW_EXTS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".ico", ".svg", ".heic", ".heif"]);
    const normalizedExt = ext.startsWith(".") ? ext.toLowerCase() : `.${ext.toLowerCase()}`;
    return PREVIEW_EXTS.has(normalizedExt);
  },
}));

import {
  getMimeType,
  getFileCategory,
  getFileTypeIcon,
  getFileTypeLabel,
  isImage,
  isVideo,
  isAudio,
  isMedia,
  isPreviewableImage,
  FILE_CATEGORIES,
} from "../lib/file-types";
import { Icon, Color } from "@raycast/api";

describe("getMimeType", () => {
  it("should return correct MIME type for .jpg", () => {
    expect(getMimeType("photo.jpg")).toBe("image/jpeg");
  });

  it("should return correct MIME type for .png", () => {
    expect(getMimeType("image.png")).toBe("image/png");
  });

  it("should return correct MIME type for .pdf", () => {
    expect(getMimeType("document.pdf")).toBe("application/pdf");
  });

  it("should return correct MIME type for .mp4", () => {
    expect(getMimeType("video.mp4")).toBe("video/mp4");
  });

  it("should return correct MIME type for .mp3", () => {
    expect(getMimeType("song.mp3")).toBe("audio/mpeg");
  });

  it("should return correct MIME type for .txt", () => {
    expect(getMimeType("readme.txt")).toBe("text/plain");
  });

  it("should return correct MIME type for .ts", () => {
    expect(getMimeType("index.ts")).toBe("video/mp2t");
  });

  it("should return null for unknown extensions", () => {
    expect(getMimeType("file.unknownext")).toBeNull();
  });

  it("should return null for files with no extension", () => {
    expect(getMimeType("Makefile")).toBeNull();
  });
});

describe("getFileCategory", () => {
  it('should return "image" for .jpg', () => {
    expect(getFileCategory("photo.jpg")).toBe("image");
  });

  it('should return "image" for .png', () => {
    expect(getFileCategory("screenshot.png")).toBe("image");
  });

  it('should return "video" for .mp4', () => {
    expect(getFileCategory("clip.mp4")).toBe("video");
  });

  it('should return "audio" for .mp3', () => {
    expect(getFileCategory("song.mp3")).toBe("audio");
  });

  it('should return "document" for .pdf', () => {
    expect(getFileCategory("report.pdf")).toBe("document");
  });

  it('should return "document" for .docx', () => {
    expect(getFileCategory("letter.docx")).toBe("document");
  });

  it('should return "spreadsheet" for .xlsx', () => {
    expect(getFileCategory("data.xlsx")).toBe("spreadsheet");
  });

  it('should return "spreadsheet" for .csv', () => {
    expect(getFileCategory("export.csv")).toBe("spreadsheet");
  });

  it('should return "code" for .html', () => {
    expect(getFileCategory("index.html")).toBe("code");
  });

  it('should return "code" for .js', () => {
    expect(getFileCategory("app.js")).toBe("code");
  });

  it('should return "code" for .css', () => {
    expect(getFileCategory("styles.css")).toBe("code");
  });

  it('should return "code" for .json', () => {
    expect(getFileCategory("package.json")).toBe("code");
  });

  it('should return "archive" for .zip', () => {
    expect(getFileCategory("backup.zip")).toBe("archive");
  });

  it('should return "archive" for .gz', () => {
    expect(getFileCategory("archive.gz")).toBe("archive");
  });

  it('should return "text" for .txt', () => {
    expect(getFileCategory("notes.txt")).toBe("text");
  });

  it("should return null for unknown extensions", () => {
    expect(getFileCategory("file.unknownext")).toBeNull();
  });

  it("should return null for files with no extension", () => {
    expect(getFileCategory("Makefile")).toBeNull();
  });
});

describe("getFileTypeIcon", () => {
  it("should return image icon for image files", () => {
    const result = getFileTypeIcon("photo.jpg");
    expect(result.source).toBe(Icon.Image);
    expect(result.tintColor).toBe(Color.Purple);
  });

  it("should return video icon for video files", () => {
    const result = getFileTypeIcon("clip.mp4");
    expect(result.source).toBe(Icon.Video);
    expect(result.tintColor).toBe(Color.Red);
  });

  it("should return music icon for audio files", () => {
    const result = getFileTypeIcon("song.mp3");
    expect(result.source).toBe(Icon.Music);
    expect(result.tintColor).toBe(Color.Orange);
  });

  it("should return document icon for documents", () => {
    const result = getFileTypeIcon("report.pdf");
    expect(result.source).toBe(Icon.Document);
    expect(result.tintColor).toBe(Color.Blue);
  });

  it("should return code icon for code files", () => {
    const result = getFileTypeIcon("app.js");
    expect(result.source).toBe(Icon.Code);
    expect(result.tintColor).toBe(Color.Green);
  });

  it("should return box icon for archive files", () => {
    const result = getFileTypeIcon("backup.zip");
    expect(result.source).toBe(Icon.Box);
    expect(result.tintColor).toBe(Color.Yellow);
  });

  it("should return default document icon for unknown files", () => {
    const result = getFileTypeIcon("file.unknownext");
    expect(result.source).toBe(Icon.Document);
    expect(result.tintColor).toBe(Color.Blue);
  });

  it("should return spreadsheet icon with green color", () => {
    const result = getFileTypeIcon("data.xlsx");
    expect(result.source).toBe(Icon.Document);
    expect(result.tintColor).toBe(Color.Green);
  });
});

describe("getFileTypeLabel", () => {
  it('should return "Image" for image files', () => {
    expect(getFileTypeLabel("photo.jpg")).toBe("Image");
  });

  it('should return "Video" for video files', () => {
    expect(getFileTypeLabel("clip.mp4")).toBe("Video");
  });

  it('should return "Audio" for audio files', () => {
    expect(getFileTypeLabel("song.mp3")).toBe("Audio");
  });

  it('should return "Document" for document files', () => {
    expect(getFileTypeLabel("report.pdf")).toBe("Document");
  });

  it('should return "Spreadsheet" for spreadsheet files', () => {
    expect(getFileTypeLabel("data.xlsx")).toBe("Spreadsheet");
  });

  it('should return "Code" for code files', () => {
    expect(getFileTypeLabel("index.html")).toBe("Code");
  });

  it('should return "Archive" for archive files', () => {
    expect(getFileTypeLabel("backup.zip")).toBe("Archive");
  });

  it('should return "Text" for text files', () => {
    expect(getFileTypeLabel("notes.txt")).toBe("Text");
  });

  it("should return uppercase extension for unknown file types", () => {
    expect(getFileTypeLabel("file.xyz")).toBe("XYZ");
  });

  it('should return "File" for files with no extension', () => {
    expect(getFileTypeLabel("Makefile")).toBe("File");
  });

  it("should return uppercase extension for unrecognized types", () => {
    expect(getFileTypeLabel("data.unknownext")).toBe("UNKNOWNEXT");
  });
});

describe("isImage", () => {
  it("should return true for .jpg files", () => {
    expect(isImage("photo.jpg")).toBe(true);
  });

  it("should return true for .png files", () => {
    expect(isImage("screenshot.png")).toBe(true);
  });

  it("should return true for .gif files", () => {
    expect(isImage("animation.gif")).toBe(true);
  });

  it("should return true for .webp files", () => {
    expect(isImage("image.webp")).toBe(true);
  });

  it("should return true for .svg files", () => {
    expect(isImage("icon.svg")).toBe(true);
  });

  it("should return false for .mp4 files", () => {
    expect(isImage("video.mp4")).toBe(false);
  });

  it("should return false for .mp3 files", () => {
    expect(isImage("song.mp3")).toBe(false);
  });

  it("should return false for .txt files", () => {
    expect(isImage("readme.txt")).toBe(false);
  });

  it("should return false for unknown extensions", () => {
    expect(isImage("file.unknownext")).toBe(false);
  });
});

describe("isVideo", () => {
  it("should return true for .mp4 files", () => {
    expect(isVideo("clip.mp4")).toBe(true);
  });

  it("should return true for .mov files", () => {
    expect(isVideo("recording.mov")).toBe(true);
  });

  it("should return true for .avi files", () => {
    expect(isVideo("movie.avi")).toBe(true);
  });

  it("should return true for .webm files", () => {
    expect(isVideo("video.webm")).toBe(true);
  });

  it("should return false for .jpg files", () => {
    expect(isVideo("photo.jpg")).toBe(false);
  });

  it("should return false for .mp3 files", () => {
    expect(isVideo("song.mp3")).toBe(false);
  });

  it("should return false for .txt files", () => {
    expect(isVideo("readme.txt")).toBe(false);
  });
});

describe("isAudio", () => {
  it("should return true for .mp3 files", () => {
    expect(isAudio("song.mp3")).toBe(true);
  });

  it("should return true for .wav files", () => {
    expect(isAudio("sound.wav")).toBe(true);
  });

  it("should return true for .ogg files", () => {
    expect(isAudio("track.ogg")).toBe(true);
  });

  it("should return true for .flac files", () => {
    expect(isAudio("lossless.flac")).toBe(true);
  });

  it("should return false for .jpg files", () => {
    expect(isAudio("photo.jpg")).toBe(false);
  });

  it("should return false for .mp4 files", () => {
    expect(isAudio("video.mp4")).toBe(false);
  });

  it("should return false for .txt files", () => {
    expect(isAudio("readme.txt")).toBe(false);
  });
});

describe("isMedia", () => {
  it("should return true for image files", () => {
    expect(isMedia("photo.jpg")).toBe(true);
    expect(isMedia("screenshot.png")).toBe(true);
  });

  it("should return true for video files", () => {
    expect(isMedia("clip.mp4")).toBe(true);
    expect(isMedia("recording.mov")).toBe(true);
  });

  it("should return true for audio files", () => {
    expect(isMedia("song.mp3")).toBe(true);
    expect(isMedia("sound.wav")).toBe(true);
  });

  it("should return false for non-media files", () => {
    expect(isMedia("report.pdf")).toBe(false);
    expect(isMedia("readme.txt")).toBe(false);
    expect(isMedia("backup.zip")).toBe(false);
    expect(isMedia("app.js")).toBe(false);
  });

  it("should return false for unknown extensions", () => {
    expect(isMedia("file.unknownext")).toBe(false);
  });
});

describe("isPreviewableImage", () => {
  it("should return true for .jpg files", () => {
    expect(isPreviewableImage("photo.jpg")).toBe(true);
  });

  it("should return true for .jpeg files", () => {
    expect(isPreviewableImage("photo.jpeg")).toBe(true);
  });

  it("should return true for .png files", () => {
    expect(isPreviewableImage("screenshot.png")).toBe(true);
  });

  it("should return true for .gif files", () => {
    expect(isPreviewableImage("animation.gif")).toBe(true);
  });

  it("should return true for .webp files", () => {
    expect(isPreviewableImage("image.webp")).toBe(true);
  });

  it("should return true for .svg files", () => {
    expect(isPreviewableImage("icon.svg")).toBe(true);
  });

  it("should return true for .heic files", () => {
    expect(isPreviewableImage("photo.heic")).toBe(true);
  });

  it("should return true for .bmp files", () => {
    expect(isPreviewableImage("image.bmp")).toBe(true);
  });

  it("should return true for .ico files", () => {
    expect(isPreviewableImage("favicon.ico")).toBe(true);
  });

  it("should return false for .pdf files", () => {
    expect(isPreviewableImage("document.pdf")).toBe(false);
  });

  it("should return false for .txt files", () => {
    expect(isPreviewableImage("readme.txt")).toBe(false);
  });

  it("should return false for .mp4 files", () => {
    expect(isPreviewableImage("video.mp4")).toBe(false);
  });

  it("should return false for .tiff files", () => {
    expect(isPreviewableImage("scan.tiff")).toBe(false);
  });
});

describe("FILE_CATEGORIES", () => {
  it("should contain all expected categories", () => {
    const expectedCategories = [
      "image",
      "video",
      "audio",
      "document",
      "spreadsheet",
      "presentation",
      "archive",
      "code",
      "text",
      "font",
      "executable",
      "data",
    ];
    expect(Object.keys(FILE_CATEGORIES)).toEqual(expect.arrayContaining(expectedCategories));
    expect(Object.keys(FILE_CATEGORIES)).toHaveLength(expectedCategories.length);
  });

  it("should have icon, color, and label for each category", () => {
    for (const key of Object.keys(FILE_CATEGORIES)) {
      const category = FILE_CATEGORIES[key as keyof typeof FILE_CATEGORIES];
      expect(category).toHaveProperty("icon");
      expect(category).toHaveProperty("color");
      expect(category).toHaveProperty("label");
      expect(typeof category.label).toBe("string");
    }
  });
});
