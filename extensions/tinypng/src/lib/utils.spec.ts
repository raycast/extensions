import { homedir } from "os";
import { describe, test, expect } from "vitest";
import { resolveOutputPath } from "./utils";

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
    const filePath = "/home/user/documents/mydoc.docx";
    const destinationFolderPath = "downloads";
    const expectedOutputPath = "/home/user/documents/downloads";
    expect(resolveOutputPath(filePath, destinationFolderPath)).toBe(expectedOutputPath);
  });

  test('should resolve relative path when destinationFolderPath is relative with "."', () => {
    const filePath = "/home/user/documents/mydoc.docx";
    const destinationFolderPath = "./downloads";
    const expectedOutputPath = "/home/user/documents/downloads";
    expect(resolveOutputPath(filePath, destinationFolderPath)).toBe(expectedOutputPath);
  });
});
