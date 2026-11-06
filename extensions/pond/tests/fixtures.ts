import type { ApiSave } from "pond-api";

export const SAVE: ApiSave = {
  id: "save-1",
  libraryId: "lib-1",
  source: "twitter",
  url: "https://x.com/pond/status/1",
  title: null,
  description: "Calm interfaces https://t.co/abc #design #ui",
  author: "pond",
  siteName: "X",
  tags: ["design"],
  folderIds: [],
  note: null,
  rating: null,
  kind: "image",
  status: "complete",
  savedAt: Date.UTC(2026, 9, 20, 12),
  publishedAt: null,
  deletedAt: null,
  media: { files: 1, width: 1200, height: 800, duration: null, bytes: 204_800 },
  thumbnail: true,
  text: { caption: true, ocr: false, transcript: false },
};
