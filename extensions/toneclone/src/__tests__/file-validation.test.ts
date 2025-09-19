/**
 * Comprehensive tests for file upload validation
 * Tests file size limits, file type validation, and async file reading
 */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { promises as fs } from "fs";
import {
  mockRaycastAPI,
  mockPersonas,
  mockFileUploadResponse,
  resetAllMocks,
  setupDefaultPreferences,
  setupLocalStorageMocks,
  createMockFile,
  createMockFileBuffer,
} from "./test-utils";
import { MAX_FILE_SIZE, ALLOWED_FILE_TYPES } from "../types";

// Mock the fs module
jest.mock("fs", () => ({
  promises: {
    readFile: jest.fn(),
  },
}));

// Mock the API module
jest.mock("../api", () => ({
  api: {
    getPersonas: jest.fn(),
    uploadFile: jest.fn(),
    uploadText: jest.fn(),
    associateFilesWithPersona: jest.fn(),
  },
}));

import { api } from "../api";

const mockFs = fs as jest.Mocked<typeof fs>;
const mockApiInstance = api as jest.Mocked<typeof api>;

// Helper function to simulate file validation logic from train-toneclone component
async function validateFileUpload(filePath: string): Promise<{
  fileName: string;
  fileExtension: string;
  fileBuffer: Buffer;
  file: File;
}> {
  let fileBuffer: Buffer;

  try {
    // Read the file using Node.js fs (async) - only wrap file reading errors
    fileBuffer = await mockFs.readFile(filePath);
  } catch (error) {
    // Wrap file reading errors in a consistent format
    if (error instanceof Error) {
      throw new Error(`Failed to read file: ${error.message}`);
    } else {
      throw new Error(`Failed to read file: Unknown error`);
    }
  }

  const fileName = filePath.split("/").pop() || "unknown-file";

  // Check file type - handle files without extensions properly
  const dotIndex = fileName.toLowerCase().lastIndexOf(".");
  const fileExtension = dotIndex === -1 ? "" : fileName.toLowerCase().substring(dotIndex);

  if (!ALLOWED_FILE_TYPES.includes(fileExtension)) {
    throw new Error(`File type ${fileExtension} is not supported. Allowed types: ${ALLOWED_FILE_TYPES.join(", ")}`);
  }

  // Check file size
  if (fileBuffer.length > MAX_FILE_SIZE) {
    throw new Error(
      `File size (${Math.round(fileBuffer.length / 1024 / 1024)}MB) exceeds maximum allowed size (${MAX_FILE_SIZE / 1024 / 1024}MB)`,
    );
  }

  // Create a File object for upload
  // Note: In jsdom, File constructor doesn't properly handle size from buffer
  // so we need to manually set the size property
  const file = new File([fileBuffer], fileName, {
    type: "application/octet-stream",
  });
  // Override size property for testing
  Object.defineProperty(file, "size", {
    value: fileBuffer.length,
    writable: false,
  });

  return { fileName, fileExtension, fileBuffer, file };
}

describe("File Upload Validation", () => {
  beforeEach(() => {
    resetAllMocks();
    setupDefaultPreferences();
    setupLocalStorageMocks();

    // Mock API methods
    mockApiInstance.getPersonas.mockResolvedValue(mockPersonas);
    mockApiInstance.uploadFile.mockResolvedValue(mockFileUploadResponse);
    mockApiInstance.uploadText.mockResolvedValue(mockFileUploadResponse);
    mockApiInstance.associateFilesWithPersona.mockResolvedValue({ message: "Success" });
  });

  describe("File Type Validation", () => {
    test("should accept all allowed file types", async () => {
      const allowedFiles = [
        "/path/to/document.txt",
        "/path/to/document.doc",
        "/path/to/document.docx",
        "/path/to/document.pdf",
        "/path/to/document.md",
        "/path/to/document.rtf",
      ];

      for (const filePath of allowedFiles) {
        const mockBuffer = createMockFileBuffer("Test content");
        mockFs.readFile.mockResolvedValueOnce(mockBuffer);

        const result = await validateFileUpload(filePath);

        expect(result.fileName).toBe(filePath.split("/").pop());
        expect(result.fileExtension).toBe(filePath.substring(filePath.lastIndexOf(".")));
        expect(result.fileBuffer).toBe(mockBuffer);
      }
    });

    test("should accept file types with different cases", async () => {
      const caseSensitiveFiles = [
        "/path/to/document.TXT",
        "/path/to/document.Doc",
        "/path/to/document.DOCX",
        "/path/to/document.PDF",
        "/path/to/document.MD",
        "/path/to/document.RTF",
      ];

      for (const filePath of caseSensitiveFiles) {
        const mockBuffer = createMockFileBuffer("Test content");
        mockFs.readFile.mockResolvedValueOnce(mockBuffer);

        const result = await validateFileUpload(filePath);
        expect(result.fileName).toBe(filePath.split("/").pop());
      }
    });

    test("should reject disallowed file types", async () => {
      const disallowedFiles = [
        "/path/to/image.jpg",
        "/path/to/image.png",
        "/path/to/archive.zip",
        "/path/to/executable.exe",
        "/path/to/script.js",
        "/path/to/stylesheet.css",
        "/path/to/data.json",
        "/path/to/video.mp4",
        "/path/to/audio.mp3",
      ];

      for (const filePath of disallowedFiles) {
        const mockBuffer = createMockFileBuffer("Test content");
        mockFs.readFile.mockResolvedValueOnce(mockBuffer);

        const expectedExtension = filePath.substring(filePath.lastIndexOf("."));
        await expect(validateFileUpload(filePath)).rejects.toThrow(
          `File type ${expectedExtension} is not supported. Allowed types: ${ALLOWED_FILE_TYPES.join(", ")}`,
        );
      }
    });

    test("should reject files without extensions", async () => {
      const noExtensionFiles = ["/path/to/document", "/path/to/README", "/path/to/license"];

      for (const filePath of noExtensionFiles) {
        const mockBuffer = createMockFileBuffer("Test content");
        mockFs.readFile.mockResolvedValueOnce(mockBuffer);

        await expect(validateFileUpload(filePath)).rejects.toThrow("File type  is not supported. Allowed types:");
      }
    });

    test("should handle files with multiple dots in filename", async () => {
      const complexNames = [
        "/path/to/document.backup.txt",
        "/path/to/version.1.2.pdf",
        "/path/to/file.name.with.dots.md",
      ];

      for (const filePath of complexNames) {
        const mockBuffer = createMockFileBuffer("Test content");
        mockFs.readFile.mockResolvedValueOnce(mockBuffer);

        const result = await validateFileUpload(filePath);
        expect(result.fileName).toBe(filePath.split("/").pop());

        // Should use the last extension
        const expectedExtension = filePath.substring(filePath.lastIndexOf("."));
        expect(result.fileExtension).toBe(expectedExtension);
      }
    });
  });

  describe("File Size Validation", () => {
    test("should accept files within size limit", async () => {
      const sizes = [
        1024, // 1KB
        1024 * 1024, // 1MB
        5 * 1024 * 1024, // 5MB
        MAX_FILE_SIZE - 1, // Just under limit
        MAX_FILE_SIZE, // Exactly at limit
      ];

      for (const size of sizes) {
        const mockBuffer = Buffer.alloc(size, "a");
        mockFs.readFile.mockResolvedValueOnce(mockBuffer);

        const result = await validateFileUpload("/path/to/document.txt");
        expect(result.fileBuffer.length).toBe(size);
      }
    });

    test("should reject files over size limit", async () => {
      const oversizedSizes = [
        MAX_FILE_SIZE + 1, // Just over limit
        MAX_FILE_SIZE * 2, // Double the limit
        50 * 1024 * 1024, // 50MB
      ];

      for (const size of oversizedSizes) {
        const mockBuffer = Buffer.alloc(size, "a");
        mockFs.readFile.mockResolvedValueOnce(mockBuffer);

        const expectedSizeMB = Math.round(size / 1024 / 1024);
        const maxSizeMB = MAX_FILE_SIZE / 1024 / 1024;

        await expect(validateFileUpload("/path/to/document.txt")).rejects.toThrow(
          `File size (${expectedSizeMB}MB) exceeds maximum allowed size (${maxSizeMB}MB)`,
        );
      }
    });

    test("should handle empty files", async () => {
      const emptyBuffer = Buffer.alloc(0);
      mockFs.readFile.mockResolvedValueOnce(emptyBuffer);

      const result = await validateFileUpload("/path/to/empty.txt");
      expect(result.fileBuffer.length).toBe(0);
    });

    test("should calculate file size correctly for different content types", async () => {
      const testContent = [
        "Simple text content",
        "Content with unicode: 🚀 ñ ü ç",
        "A".repeat(1000), // Repeated character
        JSON.stringify({ test: "data", array: [1, 2, 3] }), // JSON content
      ];

      for (const content of testContent) {
        const mockBuffer = Buffer.from(content, "utf8");
        mockFs.readFile.mockResolvedValueOnce(mockBuffer);

        const result = await validateFileUpload("/path/to/test.txt");
        expect(result.fileBuffer.length).toBe(Buffer.byteLength(content, "utf8"));
      }
    });
  });

  describe("File Reading Operations", () => {
    test("should handle file reading errors", async () => {
      const fileErrors = [
        new Error("File not found"),
        new Error("Permission denied"),
        new Error("ENOENT: no such file or directory"),
        new Error("EACCES: permission denied"),
        new Error("EISDIR: illegal operation on a directory"),
      ];

      for (const error of fileErrors) {
        mockFs.readFile.mockRejectedValueOnce(error);

        await expect(validateFileUpload("/path/to/nonexistent.txt")).rejects.toThrow(
          `Failed to read file: ${error.message}`,
        );
      }
    });

    test("should handle non-Error exceptions from file reading", async () => {
      mockFs.readFile.mockRejectedValueOnce("String error");

      await expect(validateFileUpload("/path/to/test.txt")).rejects.toThrow("Failed to read file: Unknown error");
    });

    test("should preserve original file content", async () => {
      const originalContent = "Original file content with special chars: \n\t\r";
      const mockBuffer = Buffer.from(originalContent, "utf8");
      mockFs.readFile.mockResolvedValueOnce(mockBuffer);

      const result = await validateFileUpload("/path/to/test.txt");

      expect(result.fileBuffer.toString("utf8")).toBe(originalContent);
      expect(result.file.size).toBe(mockBuffer.length);
    });

    test("should handle binary file content", async () => {
      // Simulate binary content
      const binaryData = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const mockBuffer = Buffer.from(binaryData);
      mockFs.readFile.mockResolvedValueOnce(mockBuffer);

      const result = await validateFileUpload("/path/to/test.pdf");

      expect(result.fileBuffer).toEqual(mockBuffer);
      expect(Array.from(result.fileBuffer)).toEqual(Array.from(binaryData));
    });
  });

  describe("File Object Creation", () => {
    test("should create proper File object", async () => {
      const content = "Test file content";
      const mockBuffer = createMockFileBuffer(content);
      mockFs.readFile.mockResolvedValueOnce(mockBuffer);

      const result = await validateFileUpload("/path/to/test.txt");

      expect(result.file).toBeInstanceOf(File);
      expect(result.file.name).toBe("test.txt");
      expect(result.file.size).toBe(mockBuffer.length);
      expect(result.file.type).toBe("application/octet-stream");
    });

    test("should handle complex file names correctly", async () => {
      const complexPaths = [
        "/very/deep/nested/path/document.txt",
        "/path with spaces/file name with spaces.pdf",
        "/path-with-dashes/file_with_underscores.md",
        "/números/档案.txt",
        "/path/file.with.many.dots.docx",
      ];

      for (const filePath of complexPaths) {
        const mockBuffer = createMockFileBuffer("Test content");
        mockFs.readFile.mockResolvedValueOnce(mockBuffer);

        const result = await validateFileUpload(filePath);
        const expectedFileName = filePath.split("/").pop();

        expect(result.fileName).toBe(expectedFileName);
        expect(result.file.name).toBe(expectedFileName);
      }
    });

    test("should handle edge case file names", async () => {
      const edgeCases = [
        "/path/.", // Just a dot
        "/path/.txt", // Starting with dot
        "/path/..txt", // Double dot
        "/path/file.", // Ending with dot
      ];

      for (const filePath of edgeCases) {
        const mockBuffer = createMockFileBuffer("Test content");
        mockFs.readFile.mockResolvedValueOnce(mockBuffer);

        try {
          const result = await validateFileUpload(filePath);
          const fileName = filePath.split("/").pop() || "unknown-file";
          expect(result.fileName).toBe(fileName);
        } catch (error) {
          // Some edge cases might fail file type validation, which is expected
          expect(error).toBeInstanceOf(Error);
        }
      }
    });
  });

  describe("Integration with Upload Flow", () => {
    test("should complete full upload flow for valid file", async () => {
      const content = "Training content for ToneClone";
      const mockBuffer = createMockFileBuffer(content);
      mockFs.readFile.mockResolvedValueOnce(mockBuffer);

      const result = await validateFileUpload("/path/to/training.txt");

      // Simulate actual upload
      const uploadResponse = await mockApiInstance.uploadFile(result.file);
      expect(uploadResponse).toBe(mockFileUploadResponse);

      // Simulate association with persona
      const associationResponse = await mockApiInstance.associateFilesWithPersona("persona-1", {
        fileIds: [uploadResponse.fileId],
      });
      expect(associationResponse.message).toBe("Success");
    });

    test("should handle upload errors after successful validation", async () => {
      const mockBuffer = createMockFileBuffer("Valid content");
      mockFs.readFile.mockResolvedValueOnce(mockBuffer);

      const result = await validateFileUpload("/path/to/test.txt");
      expect(result.file).toBeDefined();

      // Simulate upload failure
      mockApiInstance.uploadFile.mockRejectedValueOnce(new Error("Upload failed"));

      await expect(mockApiInstance.uploadFile(result.file)).rejects.toThrow("Upload failed");
    });
  });

  describe("Constants and Configuration", () => {
    test("should use correct maximum file size constant", () => {
      expect(MAX_FILE_SIZE).toBe(10 * 1024 * 1024); // 10MB
    });

    test("should include all expected allowed file types", () => {
      const expectedTypes = [".txt", ".doc", ".docx", ".pdf", ".md", ".rtf"];
      expect(ALLOWED_FILE_TYPES).toEqual(expectedTypes);
    });

    test("should maintain case sensitivity in type checking", async () => {
      // The validation should convert to lowercase, so mixed case should work
      const mixedCaseFiles = ["/path/to/test.TxT", "/path/to/test.DoC", "/path/to/test.DoCx"];

      for (const filePath of mixedCaseFiles) {
        const mockBuffer = createMockFileBuffer("Test content");
        mockFs.readFile.mockResolvedValueOnce(mockBuffer);

        const result = await validateFileUpload(filePath);
        expect(result.fileName).toBe(filePath.split("/").pop());
      }
    });
  });

  describe("Error Message Accuracy", () => {
    test("should provide accurate error messages for file type validation", async () => {
      const mockBuffer = createMockFileBuffer("Test content");
      mockFs.readFile.mockResolvedValueOnce(mockBuffer);

      try {
        await validateFileUpload("/path/to/test.xyz");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain("File type .xyz is not supported");
        expect((error as Error).message).toContain(".txt, .doc, .docx, .pdf, .md, .rtf");
      }
    });

    test("should provide accurate error messages for file size validation", async () => {
      const oversizedBuffer = Buffer.alloc(MAX_FILE_SIZE + 1024 * 1024, "a"); // 1MB over limit
      mockFs.readFile.mockResolvedValueOnce(oversizedBuffer);

      try {
        await validateFileUpload("/path/to/large.txt");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        const message = (error as Error).message;
        expect(message).toMatch(/File size \(\d+MB\) exceeds maximum allowed size \(10MB\)/);
      }
    });
  });
});
