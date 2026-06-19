/**
 * Mock FileInfo objects for testing
 */

import type { FileInfo } from "../../types";

export const MOCK_JPG: FileInfo = {
  path: "/tmp/test/photo.jpg",
  name: "photo.jpg",
  baseName: "photo",
  extension: ".jpg",
  isDirectory: false,
};

export const MOCK_PNG: FileInfo = {
  path: "/tmp/test/screenshot.png",
  name: "screenshot.png",
  baseName: "screenshot",
  extension: ".png",
  isDirectory: false,
};

export const MOCK_PDF: FileInfo = {
  path: "/tmp/test/document.pdf",
  name: "document.pdf",
  baseName: "document",
  extension: ".pdf",
  isDirectory: false,
};

export const MOCK_MP4: FileInfo = {
  path: "/tmp/test/video.mp4",
  name: "video.mp4",
  baseName: "video",
  extension: ".mp4",
  isDirectory: false,
};

export const MOCK_MP3: FileInfo = {
  path: "/tmp/test/song.mp3",
  name: "song.mp3",
  baseName: "song",
  extension: ".mp3",
  isDirectory: false,
};

export const MOCK_TS: FileInfo = {
  path: "/tmp/test/index.ts",
  name: "index.ts",
  baseName: "index",
  extension: ".ts",
  isDirectory: false,
};

export const MOCK_DIR: FileInfo = {
  path: "/tmp/test/folder",
  name: "folder",
  baseName: "folder",
  extension: "",
  isDirectory: true,
};

export const MOCK_TXT: FileInfo = {
  path: "/tmp/test/notes.txt",
  name: "notes.txt",
  baseName: "notes",
  extension: ".txt",
  isDirectory: false,
};
