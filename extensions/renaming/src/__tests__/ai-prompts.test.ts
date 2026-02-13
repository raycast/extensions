import { describe, it, expect, vi } from "vitest";

// Mock os-capabilities to avoid child_process issues
vi.mock("../lib/os-capabilities", () => ({
  isPreviewableImage: () => false,
}));

import type { FileInfo } from "../types";
import {
  getAIPromptForFile,
  getBatchAIPrompt,
  parseBatchAIResponse,
  cleanSuggestedName,
  MAX_SUGGESTED_NAME_LENGTH,
} from "../lib/ai-prompts";

// --- Mock Files ---

const mockImage: FileInfo = {
  path: "/tmp/photo.jpg",
  name: "photo.jpg",
  baseName: "photo",
  extension: ".jpg",
  isDirectory: false,
};

const mockVideo: FileInfo = {
  path: "/tmp/clip.mp4",
  name: "clip.mp4",
  baseName: "clip",
  extension: ".mp4",
  isDirectory: false,
};

const mockAudio: FileInfo = {
  path: "/tmp/song.mp3",
  name: "song.mp3",
  baseName: "song",
  extension: ".mp3",
  isDirectory: false,
};

const mockDoc: FileInfo = {
  path: "/tmp/report.pdf",
  name: "report.pdf",
  baseName: "report",
  extension: ".pdf",
  isDirectory: false,
};

const mockCode: FileInfo = {
  path: "/tmp/index.ts",
  name: "index.ts",
  baseName: "index",
  extension: ".ts",
  isDirectory: false,
};

const mockGeneric: FileInfo = {
  path: "/tmp/data.xyz",
  name: "data.xyz",
  baseName: "data",
  extension: ".xyz",
  isDirectory: false,
};

// --- Tests ---

describe("getAIPromptForFile", () => {
  it("returns fileType 'image' for .jpg", () => {
    const result = getAIPromptForFile(mockImage);
    expect(result.fileType).toBe("image");
  });

  it("returns fileType 'video' for .mp4", () => {
    const result = getAIPromptForFile(mockVideo);
    expect(result.fileType).toBe("video");
  });

  it("returns fileType 'audio' for .mp3", () => {
    const result = getAIPromptForFile(mockAudio);
    expect(result.fileType).toBe("audio");
  });

  it("returns fileType 'document' for .pdf", () => {
    const result = getAIPromptForFile(mockDoc);
    expect(result.fileType).toBe("document");
  });

  it("returns fileType 'code' for .js", () => {
    const jsFile = { ...mockCode, path: "/tmp/index.js", name: "index.js", extension: "js" };
    const result = getAIPromptForFile(jsFile);
    expect(result.fileType).toBe("code");
  });

  it("returns fileType 'generic' for unknown extensions", () => {
    const result = getAIPromptForFile(mockGeneric);
    expect(result.fileType).toBe("generic");
  });

  it("prompt includes the file baseName", () => {
    const result = getAIPromptForFile(mockImage);
    expect(result.prompt).toContain("photo");
  });

  it("prompt includes metadata when provided", () => {
    const metadata = {
      size: 1024,
      created: new Date("2024-01-01"),
      modified: new Date("2024-06-15"),
      exif: {
        dateTaken: new Date("2024-03-20"),
        camera: "Canon EOS R5",
        width: 4000,
        height: 3000,
      },
    };
    const result = getAIPromptForFile(mockImage, metadata);
    expect(result.prompt).toContain("Canon EOS R5");
    expect(result.prompt).toContain("4000x3000");
  });

  it("maxLength is MAX_SUGGESTED_NAME_LENGTH", () => {
    const result = getAIPromptForFile(mockImage);
    expect(result.maxLength).toBe(MAX_SUGGESTED_NAME_LENGTH);
  });
});

describe("getBatchAIPrompt", () => {
  const files = [{ file: mockImage }, { file: mockVideo }, { file: mockDoc }];

  it("contains all file names numbered", () => {
    const prompt = getBatchAIPrompt(files);
    expect(prompt).toContain("1. photo.jpg");
    expect(prompt).toContain("2. clip.mp4");
    expect(prompt).toContain("3. report.pdf");
  });

  it("contains max length constraint", () => {
    const prompt = getBatchAIPrompt(files);
    expect(prompt).toContain(`max ${MAX_SUGGESTED_NAME_LENGTH} chars`);
  });

  it("contains format instructions", () => {
    const prompt = getBatchAIPrompt(files);
    expect(prompt).toContain("snake_case");
    expect(prompt).toContain("No file extensions");
    expect(prompt).toContain("numbered");
  });
});

describe("parseBatchAIResponse", () => {
  it("parses numbered lines with dot format", () => {
    const response = "1. sunset_beach\n2. mountain_view";
    const result = parseBatchAIResponse(response, 2);
    expect(result).toEqual(["sunset_beach", "mountain_view"]);
  });

  it("parses numbered lines with parenthesis format", () => {
    const response = "1) sunset_beach\n2) mountain_view";
    const result = parseBatchAIResponse(response, 2);
    expect(result).toEqual(["sunset_beach", "mountain_view"]);
  });

  it("handles extra non-numbered text lines", () => {
    const response = "Here are the names:\n1. sunset_beach\n2. mountain_view";
    const result = parseBatchAIResponse(response, 3);
    // The first non-numbered line "Here are the names:" gets cleaned and included
    expect(result).toHaveLength(3);
    expect(result[1]).toBe("sunset_beach");
    expect(result[2]).toBe("mountain_view");
  });

  it("pads with empty strings if fewer results than expected", () => {
    const response = "1. sunset_beach";
    const result = parseBatchAIResponse(response, 3);
    expect(result).toHaveLength(3);
    expect(result[0]).toBe("sunset_beach");
    expect(result[1]).toBe("");
    expect(result[2]).toBe("");
  });

  it("stops at expectedCount", () => {
    const response = "1. name_one\n2. name_two\n3. name_three\n4. name_four";
    const result = parseBatchAIResponse(response, 2);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe("name_one");
    expect(result[1]).toBe("name_two");
  });
});

describe("cleanSuggestedName", () => {
  it("converts to lowercase", () => {
    expect(cleanSuggestedName("MyPhoto")).toBe("myphoto");
  });

  it("replaces spaces and dashes with underscores", () => {
    expect(cleanSuggestedName("my photo-name")).toBe("my_photo_name");
  });

  it("removes special characters", () => {
    expect(cleanSuggestedName("hello@world!")).toBe("helloworld");
  });

  it("collapses multiple underscores", () => {
    expect(cleanSuggestedName("a___b")).toBe("a_b");
  });

  it("trims leading and trailing underscores", () => {
    expect(cleanSuggestedName("_hello_")).toBe("hello");
  });

  it("truncates to MAX_SUGGESTED_NAME_LENGTH", () => {
    const longName = "a".repeat(MAX_SUGGESTED_NAME_LENGTH + 20);
    const result = cleanSuggestedName(longName);
    expect(result.length).toBeLessThanOrEqual(MAX_SUGGESTED_NAME_LENGTH);
  });

  it("returns 'unnamed' for empty result", () => {
    expect(cleanSuggestedName("!!!")).toBe("unnamed");
    expect(cleanSuggestedName("")).toBe("unnamed");
  });

  it("removes surrounding quotes", () => {
    expect(cleanSuggestedName('"my_file"')).toBe("my_file");
    expect(cleanSuggestedName("'my_file'")).toBe("my_file");
  });
});

describe("getAIPromptForFile with metadata branches", () => {
  it("audio prompt includes artist metadata", () => {
    const metadata = {
      spotlight: { artist: "The Beatles", album: "Abbey Road", title: "Come Together", duration: 259 },
    };
    const result = getAIPromptForFile(mockAudio, metadata);
    expect(result.fileType).toBe("audio");
    expect(result.prompt).toContain("The Beatles");
    expect(result.prompt).toContain("Abbey Road");
    expect(result.prompt).toContain("Come Together");
    expect(result.prompt).toContain("4:19");
  });

  it("audio prompt without metadata still works", () => {
    const result = getAIPromptForFile(mockAudio);
    expect(result.fileType).toBe("audio");
    expect(result.prompt).toContain("song");
  });

  it("video prompt includes duration and resolution metadata", () => {
    const metadata = {
      spotlight: { duration: 7384, pixelWidth: 1920, pixelHeight: 1080 },
      modified: new Date("2024-06-15"),
    };
    const result = getAIPromptForFile(mockVideo, metadata);
    expect(result.fileType).toBe("video");
    expect(result.prompt).toContain("1920x1080");
    expect(result.prompt).toContain("Duration");
  });

  it("video prompt includes modified date", () => {
    const metadata = { modified: new Date("2024-06-15") };
    const result = getAIPromptForFile(mockVideo, metadata);
    expect(result.prompt).toContain("Modified");
  });

  it("document prompt includes page count metadata", () => {
    const metadata = { spotlight: { pageCount: 42 }, modified: new Date("2024-01-01") };
    const result = getAIPromptForFile(mockDoc, metadata);
    expect(result.fileType).toBe("document");
    expect(result.prompt).toContain("42");
    expect(result.prompt).toContain("Modified");
  });

  it("generic prompt includes size metadata", () => {
    const metadata = { size: 5242880, modified: new Date("2024-03-01") };
    const result = getAIPromptForFile(mockGeneric, metadata);
    expect(result.fileType).toBe("generic");
    expect(result.prompt).toContain("5.0 MB");
    expect(result.prompt).toContain("Modified");
  });

  it("generic prompt without metadata still works", () => {
    const result = getAIPromptForFile(mockGeneric);
    expect(result.fileType).toBe("generic");
    expect(result.prompt).toContain("data");
  });
});
