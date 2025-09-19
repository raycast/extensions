/**
 * Test setup configuration for Jest
 * This file is run before all tests
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

// Mock global fetch for tests
global.fetch = jest.fn();

// Mock AbortController
global.AbortController = class AbortController {
  signal = { aborted: false };
  abort() {
    this.signal.aborted = true;
  }
};

// Mock TextEncoder
global.TextEncoder = class TextEncoder {
  encode(input: string): Uint8Array {
    return new Uint8Array(Buffer.from(input, "utf8"));
  }
};

// Mock File constructor for file upload tests
global.File = class File {
  name: string;
  size: number;
  type: string;
  lastModified: number;

  constructor(chunks: BlobPart[], name: string, options?: FilePropertyBag) {
    this.name = name;
    this.type = options?.type || "";
    this.lastModified = options?.lastModified || Date.now();

    // Calculate size from chunks
    this.size = chunks.reduce((total, chunk) => {
      if (chunk instanceof ArrayBuffer) {
        return total + chunk.byteLength;
      } else if (chunk instanceof Uint8Array) {
        return total + chunk.length;
      } else if (typeof chunk === "string") {
        return total + new TextEncoder().encode(chunk).length;
      }
      return total;
    }, 0);
  }
} as any;

// Mock FormData
global.FormData = class FormData {
  private data = new Map<string, any>();

  append(name: string, value: any) {
    this.data.set(name, value);
  }

  get(name: string) {
    return this.data.get(name);
  }

  has(name: string) {
    return this.data.has(name);
  }
} as any;

// Clear all mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Set up test environment variables
process.env.NODE_ENV = "test";
