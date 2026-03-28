/**
 * Mock metadata objects for testing
 */

import type { FileMetadataContext } from "../../types";

export const MOCK_IMAGE_METADATA: FileMetadataContext = {
  size: 5242880, // 5MB
  created: new Date("2024-01-15T10:30:00Z"),
  modified: new Date("2024-01-15T10:30:00Z"),
  exif: {
    dateTaken: new Date("2024-01-15T10:30:00Z"),
    width: 4032,
    height: 3024,
    camera: "iPhone 15 Pro",
    cameraMake: "Apple",
    cameraModel: "iPhone 15 Pro",
  },
};

export const MOCK_AUDIO_METADATA: FileMetadataContext = {
  size: 8388608, // 8MB
  created: new Date("2024-06-01T00:00:00Z"),
  modified: new Date("2024-06-01T00:00:00Z"),
  spotlight: {
    duration: 210,
    artist: "Artist Name",
    album: "Album Title",
    title: "Song Title",
  },
};

export const MOCK_VIDEO_METADATA: FileMetadataContext = {
  size: 104857600, // 100MB
  created: new Date("2024-03-20T14:00:00Z"),
  modified: new Date("2024-03-20T14:00:00Z"),
  spotlight: {
    duration: 120,
    pixelWidth: 1920,
    pixelHeight: 1080,
  },
};

export const MOCK_DOCUMENT_METADATA: FileMetadataContext = {
  size: 1048576, // 1MB
  created: new Date("2024-02-10T09:00:00Z"),
  modified: new Date("2024-02-10T09:00:00Z"),
  spotlight: {
    pageCount: 15,
  },
};

export const MOCK_BASIC_METADATA: FileMetadataContext = {
  size: 1024,
  created: new Date("2024-01-01T00:00:00Z"),
  modified: new Date("2024-01-01T00:00:00Z"),
};
