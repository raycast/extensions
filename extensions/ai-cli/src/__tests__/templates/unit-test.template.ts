/**
 * Unit Test Template
 *
 * Use this template for testing isolated business logic and utility functions.
 * Focus on realistic scenarios and essential edge cases only.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";

// Import the function/utility under test
import { formatResult, processData, validateInput } from "@/utils/your-utility";

describe("validateInput", () => {
  describe("Valid Inputs", () => {
    it("accepts valid input format", () => {
      const validInput = "proper input format";

      const result = validateInput(validInput);

      expect(result.success).toBe(true);
      expect(result.data).toBe(validInput);
      expect(result.errors).toHaveLength(0);
    });

    it("handles edge case at boundary", () => {
      const boundaryInput = "x".repeat(MAX_LENGTH);

      const result = validateInput(boundaryInput);

      expect(result.success).toBe(true);
    });
  });

  describe("Invalid Inputs", () => {
    it("rejects empty input", () => {
      const result = validateInput("");

      expect(result.success).toBe(false);
      expect(result.errors).toContain("Input cannot be empty");
    });

    it("rejects input exceeding length limit", () => {
      const tooLongInput = "x".repeat(MAX_LENGTH + 1);

      const result = validateInput(tooLongInput);

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain("exceeds maximum length");
    });

    it("rejects input with invalid characters", () => {
      const invalidInput = "input<script>alert('xss')</script>";

      const result = validateInput(invalidInput);

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain("contains invalid characters");
    });
  });
});

describe("processData", () => {
  describe("Data Transformation", () => {
    it("transforms data to expected format", () => {
      const input = {
        rawText: "Hello World",
        options: { format: "uppercase", trim: true },
      };

      const result = processData(input);

      expect(result).toEqual({
        processedText: "HELLO WORLD",
        metadata: {
          originalLength: 11,
          processedLength: 11,
          transformations: ["uppercase", "trim"],
        },
      });
    });

    it("handles missing optional parameters", () => {
      const input = {
        rawText: "Hello World",
        // options omitted
      };

      const result = processData(input);

      // Should use defaults
      expect(result.processedText).toBe("Hello World");
      expect(result.metadata.transformations).toEqual([]);
    });
  });

  describe("Error Handling", () => {
    it("throws descriptive error for invalid input structure", () => {
      const invalidInput = { notRawText: "wrong property" };

      expect(() => processData(invalidInput as any)).toThrow("Invalid input: missing required 'rawText' property");
    });

    it("handles null/undefined gracefully", () => {
      expect(() => processData(null as any)).toThrow("Input cannot be null or undefined");

      expect(() => processData(undefined as any)).toThrow("Input cannot be null or undefined");
    });
  });
});

describe("formatResult", () => {
  describe("Output Formatting", () => {
    it("templates result with all properties", () => {
      const input = {
        content: "Formatted content",
        timestamp: "2024-01-01T00:00:00.000Z",
        metadata: { source: "test" },
      };

      const result = formatResult(input);

      expect(result).toMatch(/^\[2024-01-01.*\] Formatted content/);
      expect(result).toContain("Source: test");
    });

    it("handles missing optional metadata", () => {
      const input = {
        content: "Content only",
        timestamp: "2024-01-01T00:00:00.000Z",
      };

      const result = formatResult(input);

      expect(result).toContain("Content only");
      expect(result).not.toContain("Source:");
    });
  });
});

// Example with setup/teardown for stateful utilities
describe("StatefulProcessor", () => {
  let processor: StatefulProcessor;

  beforeEach(() => {
    processor = new StatefulProcessor();
  });

  afterEach(() => {
    processor.cleanup();
  });

  it("maintains state across operations", () => {
    processor.addItem("item1");
    processor.addItem("item2");

    const result = processor.getItems();

    expect(result).toEqual(["item1", "item2"]);
  });

  it("resets state when requested", () => {
    processor.addItem("item1");
    processor.reset();

    const result = processor.getItems();

    expect(result).toEqual([]);
  });
});

// Example testing async utilities
describe("AsyncProcessor", () => {
  it("processes data asynchronously", async () => {
    const input = "test data";

    const result = await processDataAsync(input);

    expect(result).toEqual({
      processed: true,
      data: "PROCESSED: test data",
      duration: expect.any(Number),
    });
  });

  it("handles processing errors", async () => {
    const invalidInput = null;

    await expect(processDataAsync(invalidInput)).rejects.toThrow("Cannot process null input");
  });

  it("times out long-running operations", async () => {
    const slowInput = "simulate-slow-processing";

    await expect(processDataAsync(slowInput, { timeout: 100 })).rejects.toThrow("Processing timeout");
  }, 200); // Test timeout slightly longer than operation timeout
});
