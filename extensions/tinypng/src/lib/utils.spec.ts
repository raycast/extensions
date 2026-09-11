import { homedir } from "node:os";
import { join } from "node:path";
import { describe, test, expect, vi } from "vitest";
import { filterSupportedImagePaths, resolveOutputFile, resolveOutputPath } from "./utils";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(() => true),
  mkdirSync: vi.fn(),
}));

describe("resolveOutputPath", () => {
  test("should return absolute path when destinationFolderPath is absolute", () => {
    const filePath = "/home/user/documents/mydoc.docx";
    const destinationFolderPath = "/home/user/downloads";
    const expectedOutputPath = "/home/user/downloads";
    expect(resolveOutputPath(filePath, destinationFolderPath)).toBe(expectedOutputPath);
  });

  test('should resolve home directory when destinationFolderPath starts with "~"', () => {
    const filePath = "/home/user/documents/mydoc.docx";
    const destinationFolderPath = "~/downloads";
    const expectedOutputPath = `${homedir()}/downloads`;
    expect(resolveOutputPath(filePath, destinationFolderPath)).toBe(expectedOutputPath);
  });

  test("should resolve relative path when destinationFolderPath is relative", () => {
    const filePath = join("/home/user/documents", "mydoc.docx");
    const destinationFolderPath = "downloads";
    const expectedOutputPath = join("/home/user/documents", "downloads");
    expect(resolveOutputPath(filePath, destinationFolderPath)).toBe(expectedOutputPath);
  });

  test('should resolve relative path when destinationFolderPath is relative with "."', () => {
    const filePath = join("/home/user/documents", "mydoc.docx");
    const destinationFolderPath = "./downloads";
    const expectedOutputPath = join("/home/user/documents", "downloads");
    expect(resolveOutputPath(filePath, destinationFolderPath)).toBe(expectedOutputPath);
  });
});

describe("filterSupportedImagePaths", () => {
  test("should keep supported image paths regardless of extension case", () => {
    const filePaths = ["/d/a.png", "/d/b.JPG", "/d/c.jpeg", "/d/d.webp", "/d/e.avif"];
    expect(filterSupportedImagePaths(filePaths)).toEqual(filePaths);
  });

  test("should drop unsupported files", () => {
    const filePaths = ["/d/a.gif", "/d/b.pdf", "/d/c.svg", "/d/noextension"];
    expect(filterSupportedImagePaths(filePaths)).toEqual([]);
  });
});

describe("resolveOutputFile", () => {
  const baseOptions = { destinationFolderPath: "./compressed-images", overwrite: false };

  test("should return a suffixed sibling file when a single file is compressed", () => {
    const filePath = join("/home/user/downloads", "photo.jpg");
    expect(resolveOutputFile(filePath, { ...baseOptions, isSingleFile: true, suffix: "-compressed" })).toBe(
      join("/home/user/downloads", "photo-compressed.jpg"),
    );
  });

  test("should keep the original file name when multiple files are compressed", () => {
    const filePath = join("/home/user/downloads", "photo.jpg");
    expect(resolveOutputFile(filePath, { ...baseOptions, isSingleFile: false, suffix: "-compressed" })).toBe(
      join("/home/user/downloads", "compressed-images", "photo.jpg"),
    );
  });

  test("should return the original path when overwriting", () => {
    const filePath = join("/home/user/downloads", "photo.jpg");
    expect(
      resolveOutputFile(filePath, { ...baseOptions, overwrite: true, isSingleFile: true, suffix: "-compressed" }),
    ).toBe(filePath);
  });
});
