import { describe, it, expect } from "vitest";
import {
  RenamingError,
  FileNotFoundError,
  PermissionError,
  ConflictError,
  ValidationError,
  PathTraversalError,
  isRenamingError,
  getUserFriendlyErrorMessage,
} from "../lib/errors";

describe("error classes", () => {
  it("FileNotFoundError has correct code and userMessage", () => {
    const err = new FileNotFoundError("/tmp/missing.txt");
    expect(err.code).toBe("FILE_NOT_FOUND");
    expect(err.userMessage).toBe("Source file no longer exists.");
    expect(err.context).toEqual({ filePath: "/tmp/missing.txt" });
    expect(err.name).toBe("FileNotFoundError");
    expect(err).toBeInstanceOf(RenamingError);
    expect(err).toBeInstanceOf(Error);
  });

  it("PermissionError has correct code and preserves original error", () => {
    const original = new Error("EACCES");
    const err = new PermissionError("/tmp/locked.txt", original);
    expect(err.code).toBe("PERMISSION_DENIED");
    expect(err.userMessage).toBe("Permission denied. Check file permissions.");
    expect(err.context).toEqual({ filePath: "/tmp/locked.txt", originalError: "EACCES" });
  });

  it("PermissionError works without original error", () => {
    const err = new PermissionError("/tmp/locked.txt");
    expect(err.context).toEqual({ filePath: "/tmp/locked.txt", originalError: undefined });
  });

  it("ConflictError has correct code and context", () => {
    const err = new ConflictError("photo.jpg", "/tmp/photo.jpg");
    expect(err.code).toBe("CONFLICT");
    expect(err.userMessage).toBe("Target filename already exists.");
    expect(err.context).toEqual({ targetName: "photo.jpg", filePath: "/tmp/photo.jpg" });
  });

  it("ValidationError uses message as userMessage", () => {
    const err = new ValidationError("Filename cannot contain /", "newName");
    expect(err.code).toBe("VALIDATION");
    expect(err.userMessage).toBe("Filename cannot contain /");
    expect(err.field).toBe("newName");
    expect(err.context).toEqual({ field: "newName" });
  });

  it("ValidationError works without field", () => {
    const err = new ValidationError("Invalid input");
    expect(err.field).toBeUndefined();
  });

  it("PathTraversalError has correct code and context", () => {
    const err = new PathTraversalError("/a/file.txt", "/b/file.txt");
    expect(err.code).toBe("PATH_TRAVERSAL");
    expect(err.userMessage).toBe("Rename would move file to a different directory.");
    expect(err.context).toEqual({ oldPath: "/a/file.txt", newPath: "/b/file.txt" });
  });
});

describe("isRenamingError", () => {
  it("returns true for RenamingError subclasses", () => {
    expect(isRenamingError(new FileNotFoundError("/tmp/x"))).toBe(true);
    expect(isRenamingError(new PermissionError("/tmp/x"))).toBe(true);
    expect(isRenamingError(new ConflictError("x", "/tmp/x"))).toBe(true);
    expect(isRenamingError(new ValidationError("bad"))).toBe(true);
    expect(isRenamingError(new PathTraversalError("/a", "/b"))).toBe(true);
  });

  it("returns false for plain Error", () => {
    expect(isRenamingError(new Error("nope"))).toBe(false);
  });

  it("returns false for non-Error values", () => {
    expect(isRenamingError("string")).toBe(false);
    expect(isRenamingError(null)).toBe(false);
    expect(isRenamingError(undefined)).toBe(false);
    expect(isRenamingError(42)).toBe(false);
  });
});

describe("getUserFriendlyErrorMessage", () => {
  it("returns userMessage for RenamingError", () => {
    expect(getUserFriendlyErrorMessage(new FileNotFoundError("/tmp/x"))).toBe("Source file no longer exists.");
  });

  it("returns message for plain Error", () => {
    expect(getUserFriendlyErrorMessage(new Error("disk full"))).toBe("disk full");
  });

  it("returns fallback for non-Error values", () => {
    expect(getUserFriendlyErrorMessage("string error")).toBe("An unexpected error occurred");
    expect(getUserFriendlyErrorMessage(null)).toBe("An unexpected error occurred");
    expect(getUserFriendlyErrorMessage(undefined)).toBe("An unexpected error occurred");
  });
});
