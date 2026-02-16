import { describe, it, expect, vi } from "vitest";
import type ExifReader from "exifreader";
import type { stat } from "fs/promises";

// ── Hoisted mocks ────────────────────────────────────────────────────────────

const { execMock, execFileMock, mockReadFile, mockStat, mockExifLoad } = vi.hoisted(() => ({
  execMock: vi.fn(
    (_cmd: string, _opts: unknown, cb: (err: Error | null, result: { stdout: string; stderr: string }) => void) => {
      cb(null, { stdout: "", stderr: "" });
    },
  ),
  execFileMock: vi.fn(
    (
      _cmd: string,
      _args: string[],
      _opts: unknown,
      cb: (err: Error | null, result: { stdout: string; stderr: string }) => void,
    ) => {
      cb(null, { stdout: "", stderr: "" });
    },
  ),
  mockReadFile: vi.fn(),
  mockStat: vi.fn(),
  mockExifLoad: vi.fn(),
}));

vi.mock("child_process", () => ({
  exec: execMock,
  execFile: execFileMock,
  default: { exec: execMock, execFile: execFileMock },
}));

vi.mock("util", () => {
  // eslint-disable-next-line @typescript-eslint/ban-types
  const promisifyImpl = (fn: Function) => {
    return (...args: unknown[]) =>
      new Promise((resolve, reject) => {
        fn(...args, (err: Error | null, result: unknown) => {
          if (err) reject(err);
          else resolve(result);
        });
      });
  };
  return {
    promisify: promisifyImpl,
    default: { promisify: promisifyImpl },
  };
});

vi.mock("fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs/promises")>();
  return {
    ...actual,
    default: { ...actual, readFile: mockReadFile, stat: mockStat },
    readFile: mockReadFile,
    stat: mockStat,
  };
});

vi.mock("exifreader", () => ({
  load: mockExifLoad,
  default: { load: mockExifLoad },
}));

vi.mock("../lib/file-types", () => ({
  isImage: vi.fn((filePath: string) => {
    const ext = filePath.split(".").pop()?.toLowerCase();
    return ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "heic", "heif", "tiff", "tif", "avif"].includes(
      ext || "",
    );
  }),
}));

// ── Imports (after mocks) ────────────────────────────────────────────────────

import { getExifMetadata } from "../lib/metadata/exif";
import { getSpotlightMetadata, getRawSpotlightAttributes } from "../lib/metadata/spotlight";
import { getBasicMetadata } from "../lib/metadata/file-stats";
import { getFileMetadata, isImageFile } from "../lib/metadata/index";

// ── Tests ────────────────────────────────────────────────────────────────────

describe("metadata", () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // getExifMetadata
  // ═══════════════════════════════════════════════════════════════════════════
  describe("getExifMetadata", () => {
    it("should return null when ExifReader cannot parse the file", async () => {
      mockReadFile.mockResolvedValueOnce(Buffer.from("not-an-image"));
      mockExifLoad.mockImplementationOnce(() => {
        throw new Error("Invalid image format");
      });
      const result = await getExifMetadata("/path/to/file.txt");
      expect(result).toBeNull();
    });

    it("should return null when EXIF parsing throws an error", async () => {
      mockReadFile.mockRejectedValueOnce(new Error("File not found"));
      const result = await getExifMetadata("/path/to/photo.jpg");
      expect(result).toBeNull();
    });

    it("should return null when exif tags contain no usable data", async () => {
      mockReadFile.mockResolvedValueOnce(Buffer.from("fake-image-data"));
      mockExifLoad.mockReturnValueOnce({} as ReturnType<typeof ExifReader.load>);

      const result = await getExifMetadata("/path/to/photo.jpg");
      expect(result).toBeNull();
    });

    it("should parse dimensions from file tags", async () => {
      mockReadFile.mockResolvedValueOnce(Buffer.from("fake"));
      mockExifLoad.mockReturnValueOnce({
        file: {
          "Image Width": { value: 4000 },
          "Image Height": { value: 3000 },
        },
      } as unknown as ReturnType<typeof ExifReader.load>);

      const result = await getExifMetadata("/path/to/photo.jpg");
      expect(result).not.toBeNull();
      expect(result!.width).toBe(4000);
      expect(result!.height).toBe(3000);
      expect(result!.dimensions).toBe("4000 \u00d7 3000");
    });

    it("should parse dimensions from exif PixelXDimension/PixelYDimension", async () => {
      mockReadFile.mockResolvedValueOnce(Buffer.from("fake"));
      mockExifLoad.mockReturnValueOnce({
        exif: {
          PixelXDimension: { value: 1920 },
          PixelYDimension: { value: 1080 },
        },
      } as unknown as ReturnType<typeof ExifReader.load>);

      const result = await getExifMetadata("/path/to/photo.jpg");
      expect(result).not.toBeNull();
      expect(result!.width).toBe(1920);
      expect(result!.height).toBe(1080);
      expect(result!.dimensions).toBe("1920 \u00d7 1080");
    });

    it("should parse camera info when make and model are different", async () => {
      mockReadFile.mockResolvedValueOnce(Buffer.from("fake"));
      mockExifLoad.mockReturnValueOnce({
        exif: {
          Make: { description: "Canon" },
          Model: { description: "EOS R5" },
        },
      } as unknown as ReturnType<typeof ExifReader.load>);

      const result = await getExifMetadata("/path/to/photo.jpg");
      expect(result).not.toBeNull();
      expect(result!.cameraMake).toBe("Canon");
      expect(result!.cameraModel).toBe("EOS R5");
      expect(result!.camera).toBe("Canon EOS R5");
    });

    it("should deduplicate camera name when model starts with make", async () => {
      mockReadFile.mockResolvedValueOnce(Buffer.from("fake"));
      mockExifLoad.mockReturnValueOnce({
        exif: {
          Make: { description: "SONY" },
          Model: { description: "SONY ILCE-7M3" },
        },
      } as unknown as ReturnType<typeof ExifReader.load>);

      const result = await getExifMetadata("/path/to/photo.jpg");
      expect(result).not.toBeNull();
      expect(result!.camera).toBe("SONY ILCE-7M3");
    });

    it("should use model only when make is absent", async () => {
      mockReadFile.mockResolvedValueOnce(Buffer.from("fake"));
      mockExifLoad.mockReturnValueOnce({
        exif: {
          Model: { description: "iPhone 15 Pro" },
        },
      } as unknown as ReturnType<typeof ExifReader.load>);

      const result = await getExifMetadata("/path/to/photo.jpg");
      expect(result).not.toBeNull();
      expect(result!.camera).toBe("iPhone 15 Pro");
      expect(result!.cameraMake).toBeUndefined();
    });

    it("should parse ISO value", async () => {
      mockReadFile.mockResolvedValueOnce(Buffer.from("fake"));
      mockExifLoad.mockReturnValueOnce({
        exif: {
          ISOSpeedRatings: { value: 800 },
        },
      } as unknown as ReturnType<typeof ExifReader.load>);

      const result = await getExifMetadata("/path/to/photo.jpg");
      expect(result).not.toBeNull();
      expect(result!.iso).toBe(800);
    });

    it("should parse aperture as f-number", async () => {
      mockReadFile.mockResolvedValueOnce(Buffer.from("fake"));
      mockExifLoad.mockReturnValueOnce({
        exif: {
          FNumber: { value: [28, 10] },
        },
      } as unknown as ReturnType<typeof ExifReader.load>);

      const result = await getExifMetadata("/path/to/photo.jpg");
      expect(result).not.toBeNull();
      expect(result!.aperture).toBe("f/2.8");
    });

    it("should format shutter speed as fraction when < 1 second", async () => {
      mockReadFile.mockResolvedValueOnce(Buffer.from("fake"));
      mockExifLoad.mockReturnValueOnce({
        exif: {
          ExposureTime: { value: [1, 250] },
        },
      } as unknown as ReturnType<typeof ExifReader.load>);

      const result = await getExifMetadata("/path/to/photo.jpg");
      expect(result).not.toBeNull();
      expect(result!.shutterSpeed).toBe("1/250s");
    });

    it("should format shutter speed in seconds when >= 1 second", async () => {
      mockReadFile.mockResolvedValueOnce(Buffer.from("fake"));
      mockExifLoad.mockReturnValueOnce({
        exif: {
          ExposureTime: { value: [30, 10] },
        },
      } as unknown as ReturnType<typeof ExifReader.load>);

      const result = await getExifMetadata("/path/to/photo.jpg");
      expect(result).not.toBeNull();
      expect(result!.shutterSpeed).toBe("3s");
    });

    it("should format shutter speed for exactly 1 second", async () => {
      mockReadFile.mockResolvedValueOnce(Buffer.from("fake"));
      mockExifLoad.mockReturnValueOnce({
        exif: {
          ExposureTime: { value: [1, 1] },
        },
      } as unknown as ReturnType<typeof ExifReader.load>);

      const result = await getExifMetadata("/path/to/photo.jpg");
      expect(result).not.toBeNull();
      expect(result!.shutterSpeed).toBe("1s");
    });

    it("should parse focal length", async () => {
      mockReadFile.mockResolvedValueOnce(Buffer.from("fake"));
      mockExifLoad.mockReturnValueOnce({
        exif: {
          FocalLength: { value: [50, 1] },
        },
      } as unknown as ReturnType<typeof ExifReader.load>);

      const result = await getExifMetadata("/path/to/photo.jpg");
      expect(result).not.toBeNull();
      expect(result!.focalLength).toBe("50mm");
    });

    it("should parse focal length with fractional value", async () => {
      mockReadFile.mockResolvedValueOnce(Buffer.from("fake"));
      mockExifLoad.mockReturnValueOnce({
        exif: {
          FocalLength: { value: [240, 10] },
        },
      } as unknown as ReturnType<typeof ExifReader.load>);

      const result = await getExifMetadata("/path/to/photo.jpg");
      expect(result).not.toBeNull();
      expect(result!.focalLength).toBe("24mm");
    });

    it("should parse date taken", async () => {
      mockReadFile.mockResolvedValueOnce(Buffer.from("fake"));
      mockExifLoad.mockReturnValueOnce({
        exif: {
          DateTimeOriginal: { description: "2024:06:15 14:30:00" },
        },
      } as unknown as ReturnType<typeof ExifReader.load>);

      const result = await getExifMetadata("/path/to/photo.jpg");
      expect(result).not.toBeNull();
      expect(result!.dateTaken).toBeInstanceOf(Date);
      expect(result!.dateTaken!.getFullYear()).toBe(2024);
      expect(result!.dateTaken!.getMonth()).toBe(5); // June = 5 (0-indexed)
      expect(result!.dateTaken!.getDate()).toBe(15);
    });

    it("should parse GPS coordinates with positive values (north, east)", async () => {
      mockReadFile.mockResolvedValueOnce(Buffer.from("fake"));
      mockExifLoad.mockReturnValueOnce({
        gps: {
          Latitude: 37.7749,
          Longitude: 122.4194,
        },
      } as unknown as ReturnType<typeof ExifReader.load>);

      const result = await getExifMetadata("/path/to/photo.jpg");
      expect(result).not.toBeNull();
      expect(result!.gpsLatitude).toBe(37.7749);
      expect(result!.gpsLongitude).toBe(122.4194);
      expect(result!.gpsLocation).toBe("37.774900\u00b0 N, 122.419400\u00b0 E");
    });

    it("should parse GPS coordinates with negative values (south, west)", async () => {
      mockReadFile.mockResolvedValueOnce(Buffer.from("fake"));
      mockExifLoad.mockReturnValueOnce({
        gps: {
          Latitude: -33.8688,
          Longitude: -151.2093,
        },
      } as unknown as ReturnType<typeof ExifReader.load>);

      const result = await getExifMetadata("/path/to/photo.jpg");
      expect(result).not.toBeNull();
      expect(result!.gpsLocation).toBe("33.868800\u00b0 S, 151.209300\u00b0 W");
    });

    it("should parse color space", async () => {
      mockReadFile.mockResolvedValueOnce(Buffer.from("fake"));
      mockExifLoad.mockReturnValueOnce({
        exif: {
          ColorSpace: { description: "sRGB" },
        },
      } as unknown as ReturnType<typeof ExifReader.load>);

      const result = await getExifMetadata("/path/to/photo.jpg");
      expect(result).not.toBeNull();
      expect(result!.colorSpace).toBe("sRGB");
    });

    it("should parse orientation", async () => {
      mockReadFile.mockResolvedValueOnce(Buffer.from("fake"));
      mockExifLoad.mockReturnValueOnce({
        exif: {
          Orientation: { description: "Rotate 90 CW" },
        },
      } as unknown as ReturnType<typeof ExifReader.load>);

      const result = await getExifMetadata("/path/to/photo.jpg");
      expect(result).not.toBeNull();
      expect(result!.orientation).toBe("Rotate 90 CW");
    });

    it("should parse full EXIF metadata from a comprehensive tag set", async () => {
      mockReadFile.mockResolvedValueOnce(Buffer.from("fake"));
      mockExifLoad.mockReturnValueOnce({
        file: {
          "Image Width": { value: 6000 },
          "Image Height": { value: 4000 },
        },
        exif: {
          Make: { description: "Nikon" },
          Model: { description: "Z9" },
          ISOSpeedRatings: { value: 400 },
          FNumber: { value: [14, 10] },
          ExposureTime: { value: [1, 8000] },
          FocalLength: { value: [600, 1] },
          DateTimeOriginal: { description: "2025:01:20 09:15:30" },
          ColorSpace: { description: "sRGB" },
          Orientation: { description: "Horizontal (normal)" },
        },
        gps: {
          Latitude: 48.8566,
          Longitude: 2.3522,
        },
      } as unknown as ReturnType<typeof ExifReader.load>);

      const result = await getExifMetadata("/path/to/photo.heic");
      expect(result).not.toBeNull();
      expect(result!.width).toBe(6000);
      expect(result!.height).toBe(4000);
      expect(result!.dimensions).toBe("6000 \u00d7 4000");
      expect(result!.camera).toBe("Nikon Z9");
      expect(result!.iso).toBe(400);
      expect(result!.aperture).toBe("f/1.4");
      expect(result!.shutterSpeed).toBe("1/8000s");
      expect(result!.focalLength).toBe("600mm");
      expect(result!.colorSpace).toBe("sRGB");
      expect(result!.orientation).toBe("Horizontal (normal)");
      expect(result!.gpsLatitude).toBe(48.8566);
      expect(result!.gpsLongitude).toBe(2.3522);
    });

    it("should work with .png extension", async () => {
      mockReadFile.mockResolvedValueOnce(Buffer.from("fake"));
      mockExifLoad.mockReturnValueOnce({
        exif: {
          ColorSpace: { description: "sRGB" },
        },
      } as unknown as ReturnType<typeof ExifReader.load>);

      const result = await getExifMetadata("/path/to/image.png");
      expect(result).not.toBeNull();
      expect(result!.colorSpace).toBe("sRGB");
    });

    it("should return null when ExifReader.load throws", async () => {
      mockReadFile.mockResolvedValueOnce(Buffer.from("fake"));
      mockExifLoad.mockImplementationOnce(() => {
        throw new Error("Invalid EXIF data");
      });

      const result = await getExifMetadata("/path/to/corrupted.jpg");
      expect(result).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getSpotlightMetadata
  // ═══════════════════════════════════════════════════════════════════════════
  describe("getSpotlightMetadata", () => {
    function mockMdlsOutput(lines: string[]) {
      execFileMock.mockImplementationOnce(
        (
          _cmd: string,
          _args: string[],
          _opts: unknown,
          cb: (err: Error | null, result: { stdout: string; stderr: string }) => void,
        ) => {
          cb(null, { stdout: lines.join("\n"), stderr: "" });
        },
      );
    }

    it("should parse content type and kind", async () => {
      mockMdlsOutput(['kMDItemContentType = "public.jpeg"', 'kMDItemKind        = "JPEG Image"']);

      const result = await getSpotlightMetadata("/path/to/photo.jpg");
      expect(result).not.toBeNull();
      expect(result!.contentType).toBe("public.jpeg");
      expect(result!.kind).toBe("JPEG Image");
    });

    it("should parse duration and format it (minutes and seconds)", async () => {
      mockMdlsOutput(["kMDItemDurationSeconds = 185.5"]);

      const result = await getSpotlightMetadata("/path/to/song.mp3");
      expect(result).not.toBeNull();
      expect(result!.duration).toBe(185.5);
      expect(result!.durationFormatted).toBe("3:05");
    });

    it("should format duration with hours", async () => {
      mockMdlsOutput(["kMDItemDurationSeconds = 7384"]);

      const result = await getSpotlightMetadata("/path/to/movie.mp4");
      expect(result).not.toBeNull();
      expect(result!.duration).toBe(7384);
      expect(result!.durationFormatted).toBe("2:03:04");
    });

    it("should format duration under one minute", async () => {
      mockMdlsOutput(["kMDItemDurationSeconds = 45"]);

      const result = await getSpotlightMetadata("/path/to/clip.mp4");
      expect(result).not.toBeNull();
      expect(result!.durationFormatted).toBe("0:45");
    });

    it("should parse pixel dimensions", async () => {
      mockMdlsOutput(["kMDItemPixelWidth  = 3840", "kMDItemPixelHeight = 2160"]);

      const result = await getSpotlightMetadata("/path/to/photo.jpg");
      expect(result).not.toBeNull();
      expect(result!.pixelWidth).toBe(3840);
      expect(result!.pixelHeight).toBe(2160);
    });

    it("should parse audio metadata", async () => {
      mockMdlsOutput([
        "kMDItemAudioChannelCount = 2",
        "kMDItemAudioBitRate      = 320000",
        "kMDItemAudioSampleRate   = 44100",
      ]);

      const result = await getSpotlightMetadata("/path/to/song.mp3");
      expect(result).not.toBeNull();
      expect(result!.audioChannels).toBe(2);
      expect(result!.audioBitRate).toBe(320000);
      expect(result!.audioSampleRate).toBe(44100);
    });

    it("should parse video bit rate", async () => {
      mockMdlsOutput(["kMDItemTotalBitRate = 5000000"]);

      const result = await getSpotlightMetadata("/path/to/video.mp4");
      expect(result).not.toBeNull();
      expect(result!.videoBitRate).toBe(5000000);
    });

    it("should parse codec string", async () => {
      mockMdlsOutput(['kMDItemCodecs = ("H.264", "AAC")']);

      const result = await getSpotlightMetadata("/path/to/video.mp4");
      expect(result).not.toBeNull();
      expect(result!.codec).toBe("H.264, AAC");
    });

    it("should parse music metadata (artist, album, title, composer, genre)", async () => {
      mockMdlsOutput([
        'kMDItemAuthors      = ("Pink Floyd")',
        'kMDItemAlbum        = "The Dark Side of the Moon"',
        'kMDItemTitle        = "Time"',
        'kMDItemComposer     = "Roger Waters"',
        'kMDItemMusicalGenre = "Progressive Rock"',
      ]);

      const result = await getSpotlightMetadata("/path/to/song.flac");
      expect(result).not.toBeNull();
      expect(result!.artist).toBe("Pink Floyd");
      expect(result!.album).toBe("The Dark Side of the Moon");
      expect(result!.title).toBe("Time");
      expect(result!.composer).toBe("Roger Waters");
      expect(result!.genre).toBe("Progressive Rock");
    });

    it("should parse document metadata (page count, creator)", async () => {
      mockMdlsOutput(["kMDItemNumberOfPages = 42", 'kMDItemCreator       = "Adobe InDesign"']);

      const result = await getSpotlightMetadata("/path/to/document.pdf");
      expect(result).not.toBeNull();
      expect(result!.pageCount).toBe(42);
      expect(result!.creator).toBe("Adobe InDesign");
    });

    it("should set author when kMDItemAuthors is present and artist is not already set", async () => {
      // When kMDItemAuthors appears, it first sets artist. The second check
      // for author only fires if artist was NOT already set. In practice
      // they share the same key so artist always wins. We test that artist
      // is populated and author is NOT set (because the condition `!metadata.artist` is false).
      mockMdlsOutput(['kMDItemAuthors = ("Jane Doe")']);

      const result = await getSpotlightMetadata("/path/to/file.pdf");
      expect(result).not.toBeNull();
      expect(result!.artist).toBe("Jane Doe");
      // author is also set since our fix changed the guard to !metadata.author (not !metadata.artist)
      expect(result!.author).toBe("Jane Doe");
    });

    it("should skip (null) values", async () => {
      mockMdlsOutput(["kMDItemContentType = (null)", 'kMDItemKind        = "JPEG Image"']);

      const result = await getSpotlightMetadata("/path/to/photo.jpg");
      expect(result).not.toBeNull();
      expect(result!.contentType).toBeUndefined();
      expect(result!.kind).toBe("JPEG Image");
    });

    it("should return null when mdls output has no valid attributes", async () => {
      mockMdlsOutput(["kMDItemContentType = (null)", "kMDItemKind        = (null)", "", "  some garbage line  "]);

      const result = await getSpotlightMetadata("/path/to/unknown");
      expect(result).toBeNull();
    });

    it("should return null when exec fails", async () => {
      execFileMock.mockImplementationOnce(
        (
          _cmd: string,
          _args: string[],
          _opts: unknown,
          cb: (err: Error | null, result: { stdout: string; stderr: string } | null) => void,
        ) => {
          cb(new Error("Command failed"), null);
        },
      );

      const result = await getSpotlightMetadata("/path/to/file.txt");
      expect(result).toBeNull();
    });

    it("should pass file path as argument without shell escaping", async () => {
      mockMdlsOutput(['kMDItemKind = "JPEG Image"']);

      await getSpotlightMetadata("/path/to/it's a photo.jpg");

      const lastCall = execFileMock.mock.calls[execFileMock.mock.calls.length - 1]!;
      const args = lastCall[1] as string[];
      expect(args).toContain("/path/to/it's a photo.jpg");
    });

    it("should handle empty mdls output", async () => {
      mockMdlsOutput([]);

      const result = await getSpotlightMetadata("/path/to/file.bin");
      expect(result).toBeNull();
    });

    it("should parse video frame rate", async () => {
      mockMdlsOutput(["kMDItemVideoFrameRate = 29.97"]);

      const result = await getSpotlightMetadata("/path/to/video.mp4");
      expect(result).not.toBeNull();
      expect(result!.frameRate).toBeCloseTo(29.97);
    });

    it("should parse recording year", async () => {
      mockMdlsOutput(["kMDItemRecordingYear = 2024"]);

      const result = await getSpotlightMetadata("/path/to/song.mp3");
      expect(result).not.toBeNull();
      expect(result!.year).toBe(2024);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getRawSpotlightAttributes
  // ═══════════════════════════════════════════════════════════════════════════
  describe("getRawSpotlightAttributes", () => {
    function mockMdlsOutput(lines: string[]) {
      execFileMock.mockImplementationOnce(
        (
          _cmd: string,
          _args: string[],
          _opts: unknown,
          cb: (err: Error | null, result: { stdout: string; stderr: string }) => void,
        ) => {
          cb(null, { stdout: lines.join("\n"), stderr: "" });
        },
      );
    }

    it("should return all attributes as a raw Map", async () => {
      mockMdlsOutput([
        'kMDItemContentType = "public.jpeg"',
        'kMDItemKind        = "JPEG Image"',
        "kMDItemPixelWidth  = 3840",
        'kMDItemWhereFroms  = "https://example.com"',
      ]);

      const result = await getRawSpotlightAttributes("/path/to/photo.jpg");
      expect(result).not.toBeNull();
      expect(result!.size).toBe(4);
      expect(result!.get("kMDItemContentType")).toBe("public.jpeg");
      expect(result!.get("kMDItemKind")).toBe("JPEG Image");
      expect(result!.get("kMDItemPixelWidth")).toBe("3840");
      expect(result!.get("kMDItemWhereFroms")).toBe("https://example.com");
    });

    it("should return null for empty output", async () => {
      mockMdlsOutput([]);

      const result = await getRawSpotlightAttributes("/path/to/file.bin");
      expect(result).toBeNull();
    });

    it("should return null on exec failure", async () => {
      execFileMock.mockImplementationOnce(
        (
          _cmd: string,
          _args: string[],
          _opts: unknown,
          cb: (err: Error | null, result: { stdout: string; stderr: string } | null) => void,
        ) => {
          cb(new Error("Command failed"), null);
        },
      );

      const result = await getRawSpotlightAttributes("/path/to/file.txt");
      expect(result).toBeNull();
    });

    it("should skip (null) values", async () => {
      mockMdlsOutput(["kMDItemContentType = (null)", 'kMDItemKind = "Text"']);

      const result = await getRawSpotlightAttributes("/path/to/file.txt");
      expect(result).not.toBeNull();
      expect(result!.has("kMDItemContentType")).toBe(false);
      expect(result!.get("kMDItemKind")).toBe("Text");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getBasicMetadata
  // ═══════════════════════════════════════════════════════════════════════════
  describe("getBasicMetadata", () => {
    it("should return formatted file stats for a regular file", async () => {
      const birthtime = new Date("2024-01-15T10:00:00Z");
      const mtime = new Date("2024-06-20T14:30:00Z");

      mockStat.mockResolvedValueOnce({
        size: 2048576,
        birthtime,
        mtime,
        isDirectory: () => false,
      } as unknown as Awaited<ReturnType<typeof stat>>);

      const result = await getBasicMetadata("/path/to/file.jpg");
      expect(result).not.toBeNull();
      expect(result!.size).toBe(2048576);
      expect(result!.sizeFormatted).toBe("2.0 MB");
      expect(result!.created).toBe(birthtime);
      expect(result!.modified).toBe(mtime);
      expect(result!.isDirectory).toBe(false);
    });

    it("should identify directories", async () => {
      mockStat.mockResolvedValueOnce({
        size: 4096,
        birthtime: new Date(),
        mtime: new Date(),
        isDirectory: () => true,
      } as unknown as Awaited<ReturnType<typeof stat>>);

      const result = await getBasicMetadata("/path/to/folder");
      expect(result).not.toBeNull();
      expect(result!.isDirectory).toBe(true);
    });

    it("should format 0 bytes correctly", async () => {
      mockStat.mockResolvedValueOnce({
        size: 0,
        birthtime: new Date(),
        mtime: new Date(),
        isDirectory: () => false,
      } as unknown as Awaited<ReturnType<typeof stat>>);

      const result = await getBasicMetadata("/path/to/empty.txt");
      expect(result).not.toBeNull();
      expect(result!.sizeFormatted).toBe("0 B");
    });

    it("should format bytes (< 1 KB)", async () => {
      mockStat.mockResolvedValueOnce({
        size: 512,
        birthtime: new Date(),
        mtime: new Date(),
        isDirectory: () => false,
      } as unknown as Awaited<ReturnType<typeof stat>>);

      const result = await getBasicMetadata("/path/to/small.txt");
      expect(result).not.toBeNull();
      expect(result!.sizeFormatted).toBe("512 B");
    });

    it("should format kilobytes", async () => {
      mockStat.mockResolvedValueOnce({
        size: 15360, // 15 KB
        birthtime: new Date(),
        mtime: new Date(),
        isDirectory: () => false,
      } as unknown as Awaited<ReturnType<typeof stat>>);

      const result = await getBasicMetadata("/path/to/file.txt");
      expect(result).not.toBeNull();
      expect(result!.sizeFormatted).toBe("15.0 KB");
    });

    it("should format gigabytes", async () => {
      mockStat.mockResolvedValueOnce({
        size: 2147483648, // 2 GB
        birthtime: new Date(),
        mtime: new Date(),
        isDirectory: () => false,
      } as unknown as Awaited<ReturnType<typeof stat>>);

      const result = await getBasicMetadata("/path/to/large.iso");
      expect(result).not.toBeNull();
      expect(result!.sizeFormatted).toBe("2.0 GB");
    });

    it("should return null when stat fails", async () => {
      mockStat.mockRejectedValueOnce(new Error("ENOENT"));

      const result = await getBasicMetadata("/nonexistent/file.txt");
      expect(result).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getFileMetadata (index)
  // ═══════════════════════════════════════════════════════════════════════════
  describe("getFileMetadata", () => {
    it("should aggregate basic, exif, and spotlight metadata for an image", async () => {
      // Mock stat for basic metadata
      mockStat.mockResolvedValueOnce({
        size: 1024,
        birthtime: new Date("2024-01-01"),
        mtime: new Date("2024-06-01"),
        isDirectory: () => false,
      } as unknown as Awaited<ReturnType<typeof stat>>);

      // Mock readFile + ExifReader for exif metadata
      mockReadFile.mockResolvedValueOnce(Buffer.from("fake"));
      mockExifLoad.mockReturnValueOnce({
        exif: {
          Make: { description: "Apple" },
          Model: { description: "iPhone 15 Pro" },
        },
      } as unknown as ReturnType<typeof ExifReader.load>);

      // Mock execFile for spotlight metadata
      execFileMock.mockImplementationOnce(
        (
          _cmd: string,
          _args: string[],
          _opts: unknown,
          cb: (err: Error | null, result: { stdout: string; stderr: string }) => void,
        ) => {
          cb(null, {
            stdout: 'kMDItemContentType = "public.jpeg"\nkMDItemKind        = "JPEG Image"',
            stderr: "",
          });
        },
      );

      const result = await getFileMetadata("/path/to/photo.jpg");

      expect(result.basic).toBeDefined();
      expect(result.basic!.size).toBe(1024);

      expect(result.exif).toBeDefined();
      expect(result.exif!.camera).toBe("Apple iPhone 15 Pro");

      expect(result.spotlight).toBeDefined();
      expect(result.spotlight!.contentType).toBe("public.jpeg");
    });

    it("should return undefined exif for non-image files", async () => {
      mockStat.mockResolvedValueOnce({
        size: 500,
        birthtime: new Date(),
        mtime: new Date(),
        isDirectory: () => false,
      } as unknown as Awaited<ReturnType<typeof stat>>);

      execFileMock.mockImplementationOnce(
        (
          _cmd: string,
          _args: string[],
          _opts: unknown,
          cb: (err: Error | null, result: { stdout: string; stderr: string }) => void,
        ) => {
          cb(null, { stdout: 'kMDItemKind = "Plain Text"', stderr: "" });
        },
      );

      const result = await getFileMetadata("/path/to/file.txt");

      expect(result.basic).toBeDefined();
      expect(result.exif).toBeUndefined();
      expect(result.spotlight).toBeDefined();
    });

    it("should handle all metadata sources returning null", async () => {
      mockStat.mockRejectedValueOnce(new Error("ENOENT"));
      execFileMock.mockImplementationOnce(
        (_cmd: string, _args: string[], _opts: unknown, cb: (err: Error | null, result: null) => void) => {
          cb(new Error("no such file"), null);
        },
      );

      const result = await getFileMetadata("/nonexistent/file.txt");

      expect(result.basic).toBeUndefined();
      expect(result.exif).toBeUndefined();
      expect(result.spotlight).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // isImageFile
  // ═══════════════════════════════════════════════════════════════════════════
  describe("isImageFile", () => {
    it("should return true for image files", () => {
      expect(isImageFile("/path/to/photo.jpg")).toBe(true);
      expect(isImageFile("/path/to/image.png")).toBe(true);
      expect(isImageFile("/path/to/pic.gif")).toBe(true);
    });

    it("should return false for non-image files", () => {
      expect(isImageFile("/path/to/file.txt")).toBe(false);
      expect(isImageFile("/path/to/video.mp4")).toBe(false);
      expect(isImageFile("/path/to/song.mp3")).toBe(false);
    });
  });
});
