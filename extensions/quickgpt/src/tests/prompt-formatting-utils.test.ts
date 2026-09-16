import { findUsedOptionPlaceholders } from "../utils/option-placeholder-utils";
import type { PromptProps } from "../managers/prompt-manager";
import { SpecificReplacements } from "../utils/placeholder-formatter";

describe("findUsedOptionPlaceholders", () => {
  it("should find direct option placeholders", () => {
    const prompt: PromptProps & { type: string[] } = {
      identifier: "test-1",
      title: "Test",
      content: "Process this: {{option:type}}",
      type: ["text", "code", "markdown"],
    };
    const replacements: SpecificReplacements = {};

    const result = findUsedOptionPlaceholders(prompt, replacements);
    expect(result).toEqual(["type"]);
  });

  it("should find option in fallback chain when previous values are empty", () => {
    const prompt: PromptProps & { defaultType: string[] } = {
      identifier: "test-2",
      title: "Test",
      content: "Process this: {{i|option:defaultType}}",
      defaultType: ["text", "code", "markdown"],
    };
    const replacements: SpecificReplacements = {
      input: "", // Empty input, should fallback to option
    };

    const result = findUsedOptionPlaceholders(prompt, replacements);
    expect(result).toEqual(["defaultType"]);
  });

  it("should not find option in fallback chain when previous value exists", () => {
    const prompt: PromptProps & { defaultType: string[] } = {
      identifier: "test-3",
      title: "Test",
      content: "Process this: {{i|option:defaultType}}",
      defaultType: ["text", "code", "markdown"],
    };
    const replacements: SpecificReplacements = {
      input: "user input", // Has input, should not fallback to option
    };

    const result = findUsedOptionPlaceholders(prompt, replacements);
    expect(result).toEqual([]);
  });

  it("should find option in complex fallback chain", () => {
    const prompt: PromptProps & { backupContent: string[] } = {
      identifier: "test-4",
      title: "Test",
      content: "Process this: {{selection|option:backupContent|clipboard}}",
      backupContent: ["No content available", "Please provide input"],
    };
    const replacements: SpecificReplacements = {
      selection: "", // Empty
      clipboard: "clipboard content", // Has value
    };

    const result = findUsedOptionPlaceholders(prompt, replacements);
    expect(result).toEqual(["backupContent"]);
  });

  it("should handle multiple option placeholders", () => {
    const prompt: PromptProps & { defaultStyle: string[]; format: string[] } = {
      identifier: "test-5",
      title: "Test",
      content: "Style: {{i|option:defaultStyle}} Format: {{option:format}}",
      defaultStyle: ["casual", "formal"],
      format: ["paragraph", "list"],
    };
    const replacements: SpecificReplacements = {
      input: "", // Empty, will use defaultStyle
    };

    const result = findUsedOptionPlaceholders(prompt, replacements);
    expect(result.sort()).toEqual(["defaultStyle", "format"].sort());
  });

  it("should ignore options that don't exist in prompt", () => {
    const prompt: PromptProps = {
      identifier: "test-6",
      title: "Test",
      content: "Process this: {{i|option:nonExistentOption}}",
      // nonExistentOption is not defined in prompt
    };
    const replacements: SpecificReplacements = {
      input: "",
    };

    const result = findUsedOptionPlaceholders(prompt, replacements);
    expect(result).toEqual([]);
  });

  it("should handle empty content", () => {
    const prompt: PromptProps = {
      identifier: "test-7",
      title: "Test",
      content: "",
    };
    const replacements: SpecificReplacements = {};

    const result = findUsedOptionPlaceholders(prompt, replacements);
    expect(result).toEqual([]);
  });

  it("should handle object-type options", () => {
    const prompt: PromptProps & { recipient: Record<string, string> } = {
      identifier: "test-8",
      title: "Test",
      content: "Recipient: {{option:recipient}}",
      recipient: {
        Colleague: "informal but professional",
        Manager: "formal and respectful",
      },
    };
    const replacements: SpecificReplacements = {};

    const result = findUsedOptionPlaceholders(prompt, replacements);
    expect(result).toEqual(["recipient"]);
  });
});
