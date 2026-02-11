import { expect, test, describe } from "vitest";
import { fileValidation } from "./index";

const ERRORS = {
  fileType: "Invalid file type.",
  required: "The item is required.",
};

describe("Valid extensions", () => {
  const validFiles = ["abcdefg.png", "abcdefg.jpg", "abcdefg.jpeg", "abcdefg.gif"];
  test.each(validFiles)("should validate %s as valid", (file) => {
    expect(fileValidation([file])).toBeUndefined();
  });
});

describe("invalid extensions", () => {
  const invalidFiles = [
    "abcdefg.webp",
    "abcdefg.avif",
    "abcdefg.pdf",
    "abcdefg.bmp",
    "abcdefg.tif",
    "abcdefg.tiff",
    "abcdefg.heic",
    "abcdefg.heif",
    "abcdefg.svg",
  ];
  test.each(invalidFiles)("should return file type error for %s", (file) => {
    expect(fileValidation([file])).toBe(ERRORS.fileType);
  });
});

describe("required", () => {
  test("should return required error for empty array", () => {
    expect(fileValidation([])).toBe(ERRORS.required);
  });

  test("should return required error for undefined", () => {
    expect(fileValidation(undefined)).toBe(ERRORS.required);
  });
});
