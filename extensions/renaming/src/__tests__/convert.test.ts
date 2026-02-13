import { describe, it, expect } from "vitest";
import { toFileMetadataContext } from "../lib/metadata/convert";
import type { FileMetadata } from "../lib/metadata/types";

describe("toFileMetadataContext", () => {
  const baseDate = new Date("2024-01-15T10:30:00Z");
  const modDate = new Date("2024-06-20T14:00:00Z");

  it("returns null when basic metadata is missing", () => {
    const metadata: FileMetadata = {};
    expect(toFileMetadataContext(metadata)).toBeNull();
  });

  it("converts basic metadata only", () => {
    const metadata: FileMetadata = {
      basic: {
        size: 1024,
        sizeFormatted: "1 KB",
        created: baseDate,
        modified: modDate,
        isDirectory: false,
      },
    };

    const result = toFileMetadataContext(metadata);
    expect(result).toEqual({
      size: 1024,
      created: baseDate,
      modified: modDate,
    });
    expect(result?.exif).toBeUndefined();
    expect(result?.spotlight).toBeUndefined();
  });

  it("converts basic + exif metadata", () => {
    const exifDate = new Date("2024-03-10T08:15:00Z");
    const metadata: FileMetadata = {
      basic: {
        size: 5000000,
        sizeFormatted: "5 MB",
        created: baseDate,
        modified: modDate,
        isDirectory: false,
      },
      exif: {
        width: 4032,
        height: 3024,
        cameraMake: "Apple",
        cameraModel: "iPhone 15 Pro",
        camera: "Apple iPhone 15 Pro",
        dateTaken: exifDate,
      },
    };

    const result = toFileMetadataContext(metadata);
    expect(result).not.toBeNull();
    expect(result?.exif).toEqual({
      dateTaken: exifDate,
      width: 4032,
      height: 3024,
      camera: "Apple iPhone 15 Pro",
      cameraMake: "Apple",
      cameraModel: "iPhone 15 Pro",
    });
  });

  it("converts basic + spotlight metadata", () => {
    const metadata: FileMetadata = {
      basic: {
        size: 50000000,
        sizeFormatted: "50 MB",
        created: baseDate,
        modified: modDate,
        isDirectory: false,
      },
      spotlight: {
        duration: 180.5,
        durationFormatted: "3:00",
        artist: "Test Artist",
        album: "Test Album",
        title: "Test Song",
        pixelWidth: 1920,
        pixelHeight: 1080,
        pageCount: 42,
        audioChannels: 2,
        audioBitRate: 320000,
      },
    };

    const result = toFileMetadataContext(metadata);
    expect(result).not.toBeNull();
    expect(result?.spotlight).toEqual({
      duration: 180.5,
      artist: "Test Artist",
      album: "Test Album",
      title: "Test Song",
      pixelWidth: 1920,
      pixelHeight: 1080,
      pageCount: 42,
      audioChannelCount: 2,
      audioBitRate: 320000,
    });
  });

  it("converts all metadata sources together", () => {
    const metadata: FileMetadata = {
      basic: {
        size: 1024,
        sizeFormatted: "1 KB",
        created: baseDate,
        modified: modDate,
        isDirectory: false,
      },
      exif: {
        width: 640,
        height: 480,
      },
      spotlight: {
        artist: "Someone",
      },
    };

    const result = toFileMetadataContext(metadata);
    expect(result).not.toBeNull();
    expect(result?.size).toBe(1024);
    expect(result?.exif?.width).toBe(640);
    expect(result?.spotlight?.artist).toBe("Someone");
  });

  it("handles sparse exif data (undefined fields)", () => {
    const metadata: FileMetadata = {
      basic: {
        size: 100,
        sizeFormatted: "100 B",
        created: baseDate,
        modified: modDate,
        isDirectory: false,
      },
      exif: {},
    };

    const result = toFileMetadataContext(metadata);
    expect(result?.exif).toEqual({
      dateTaken: undefined,
      width: undefined,
      height: undefined,
      camera: undefined,
      cameraMake: undefined,
      cameraModel: undefined,
    });
  });

  it("handles sparse spotlight data (undefined fields)", () => {
    const metadata: FileMetadata = {
      basic: {
        size: 100,
        sizeFormatted: "100 B",
        created: baseDate,
        modified: modDate,
        isDirectory: false,
      },
      spotlight: {},
    };

    const result = toFileMetadataContext(metadata);
    expect(result?.spotlight).toEqual({
      duration: undefined,
      artist: undefined,
      album: undefined,
      title: undefined,
      pixelWidth: undefined,
      pixelHeight: undefined,
      pageCount: undefined,
      audioChannelCount: undefined,
      audioBitRate: undefined,
    });
  });
});
