import { describe, expect, it } from "vitest";
import { formatVariantMarkdown } from "@/utils/variant-formatting";
import { FormattingVariant } from "@/types";

const createMockVariant = (overrides: Partial<FormattingVariant> = {}): FormattingVariant => ({
  id: "test-variant-id",
  content: "Default content",
  index: 0,
  ...overrides,
});

describe("formatVariantMarkdown", () => {
  it("should format variant with content only", () => {
    const variant = createMockVariant({
      content: "This is the main content",
    });

    const result = formatVariantMarkdown(variant);

    expect(result).toBe("This is the main content\n\n---\n\n");
  });

  it("should format variant with original input as quote", () => {
    const variant = createMockVariant({
      content: "Response content",
      originalInput: "What is TypeScript?",
    });

    const result = formatVariantMarkdown(variant);

    expect(result).toBe("Response content\n\n---\n\n> What is TypeScript?\n\n");
  });

  it("should format variant with original prompt as code block", () => {
    const variant = createMockVariant({
      content: "Generated response",
      originalPrompt: "You are a helpful assistant.",
    });

    const result = formatVariantMarkdown(variant);

    expect(result).toBe("Generated response\n\n---\n\n```\nYou are a helpful assistant.\n```");
  });

  it("should prioritize originalInput over originalPrompt", () => {
    const variant = createMockVariant({
      content: "Response content",
      originalInput: "User question",
      originalPrompt: "System prompt",
    });

    const result = formatVariantMarkdown(variant);

    expect(result).toBe("Response content\n\n---\n\n> User question\n\n");
    expect(result).not.toContain("System prompt");
  });

  it("should use originalPrompt when originalInput is empty", () => {
    const variant = createMockVariant({
      content: "Response content",
      originalInput: "",
      originalPrompt: "System prompt",
    });

    const result = formatVariantMarkdown(variant);

    expect(result).toBe("Response content\n\n---\n\n```\nSystem prompt\n```");
  });
});
