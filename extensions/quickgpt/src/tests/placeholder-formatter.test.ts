import { placeholderFormatter, SpecificReplacements, resolvePlaceholders } from "../utils/placeholder-formatter";

describe("placeholderFormatter", () => {
  it("should replace {{input}} and {{clipboard}}", () => {
    const text = "Hello {{input}}, your clipboard says {{clipboard}}";
    const replacements: SpecificReplacements = {
      input: "World",
      clipboard: "Copy me",
    };
    const result = placeholderFormatter(text, replacements);
    expect(result).toBe("Hello World, your clipboard says Copy me");
  });

  it("should prioritize {{clipboard|input}} over {{clipboard}}", () => {
    const text = "Hello {{clipboard|input}}, your clipboard says {{clipboard}}";
    const replacements: SpecificReplacements = {
      input: "World",
      clipboard: "Copy me",
    };
    const result = placeholderFormatter(text, replacements);
    expect(result).toBe("Hello Copy me, your clipboard says Copy me");
  });

  it("should use {{input|selection|clipboard}} with selection", () => {
    const text = "Content: {{input|selection|clipboard}}";
    const replacements: SpecificReplacements = {
      selection: "Selected text",
    };
    const result = placeholderFormatter(text, replacements);
    expect(result).toBe("Content: Selected text");
  });

  it("should use aliases {{i}} {{s}} {{c}}", () => {
    const text = "Input: {{i}}, Selection: {{s}}, Clipboard: {{c}}";
    const replacements: SpecificReplacements = {
      input: "Input text",
      selection: "Selected text",
      clipboard: "Clipboard text",
    };
    const result = placeholderFormatter(text, replacements);
    expect(result).toBe("Input: Input text, Selection: Selected text, Clipboard: Clipboard text");
  });

  it("should prioritize replacements in {{i|s|c}}", () => {
    const text = "Content: {{i|s|c}}";

    const replacements1: SpecificReplacements = {
      input: "Input text",
      selection: "Selected text",
      clipboard: "Clipboard text",
    };
    expect(placeholderFormatter(text, replacements1)).toBe("Content: Input text");

    const replacements2: SpecificReplacements = {
      selection: "Selected text",
      clipboard: "Clipboard text",
    };
    expect(placeholderFormatter(text, replacements2)).toBe("Content: Selected text");

    const replacements3: SpecificReplacements = {
      clipboard: "Clipboard text",
    };
    expect(placeholderFormatter(text, replacements3)).toBe("Content: Clipboard text");
  });

  it("should handle unknown placeholders", () => {
    const text = "Hello {{unknown}}";
    const replacements: SpecificReplacements = {};
    expect(placeholderFormatter(text, replacements)).toBe("Hello {{unknown}}");
  });

  it("should handle empty replacements", () => {
    const text = "Content: {{input}}";
    const replacements: SpecificReplacements = {
      clipboard: "Clipboard text",
    };
    expect(placeholderFormatter(text, replacements)).toBe("Content: {{input}}");
  });

  it("should replace {{currentApp}}", () => {
    const text = "Current app: {{currentApp}}";
    const replacements: SpecificReplacements = {
      currentApp: "VS Code",
    };
    expect(placeholderFormatter(text, replacements)).toBe("Current app: VS Code");
  });

  it("should handle empty input replacements", () => {
    const text = "Content: {{input}}";
    const replacements: SpecificReplacements = {
      input: "",
    };
    expect(placeholderFormatter(text, replacements)).toBe("Content: {{input}}");
  });

  it("should replace {{title}} with property value from prompt object", () => {
    const text = "Title is {{title}}, Count: {{count}}";
    const mergedReplacements = {
      title: "My Awesome Prompt",
      icon: "📎",
      count: 123,
      input: "user input",
      clipboard: "clipboard data",
    };
    const result = placeholderFormatter(text, mergedReplacements);
    expect(result).toBe("Title is My Awesome Prompt, Count: 123");
  });

  it("should handle nested property paths with {{property.path}}", () => {
    const text = "Nested property: {{nested.property}}";
    const mergedReplacements = {
      nested: {
        property: "nested value",
      },
    };
    const result = placeholderFormatter(text, mergedReplacements);
    expect(result).toBe("Nested property: nested value");
  });

  it("should handle array indices in property paths", () => {
    const text = "Array item: {{items.1.name}}";
    const mergedReplacements = {
      items: [{ name: "First item" }, { name: "Second item" }, { name: "Third item" }],
    };
    const result = placeholderFormatter(text, mergedReplacements);
    expect(result).toBe("Array item: Second item");
  });

  it("should prioritize standard replacements over prompt properties with same name", () => {
    const text = "Value is {{input}}";
    const mergedReplacements = {
      input: "prompt default input",
    };
    const standardReplacements = {
      input: "user input",
    };
    const result = placeholderFormatter(text, { ...mergedReplacements, ...standardReplacements });
    expect(result).toBe("Value is user input");
  });

  it("should use prompt.input property if standard {{input}} is empty or missing", () => {
    const text = "Input value: {{input}}";
    const promptData = { title: "Test", input: "prompt default input" };
    const replacements = { clipboard: "some data" };
    const merged = { ...promptData, ...replacements };
    const result = placeholderFormatter(text, merged);
    expect(result).toBe("Input value: prompt default input");
  });

  it("should return {{propertyName}} unchanged if property doesn't exist and is not a standard placeholder", () => {
    const text = "Missing property: {{nonexistent.property}}";
    const mergedReplacements = {
      someOtherProperty: "value",
    };
    const result = placeholderFormatter(text, mergedReplacements);
    expect(result).toBe("Missing property: {{nonexistent.property}}");
  });

  it("should convert non-string values to strings", () => {
    const text = "Number: {{number}}, Boolean: {{flag}}, Null: {{nullValue}}";
    const mergedReplacements = {
      number: 42,
      flag: true,
      nullValue: null,
    };
    const result = placeholderFormatter(text, mergedReplacements);
    expect(result).toBe("Number: 42, Boolean: true, Null: null");
  });

  it("should handle standard placeholders when no value is provided", () => {
    const text = "Input: {{input}}, Selection: {{selection}}";
    const replacements = {};
    const result = placeholderFormatter(text, replacements);
    expect(result).toBe("Input: {{input}}, Selection: {{selection}}");
  });
});

describe("resolvePlaceholders", () => {
  it("should identify used placeholders in a template", () => {
    const text = "Hello {{input}}, your clipboard says {{clipboard}}";
    const replacements: SpecificReplacements = {
      input: "World",
      clipboard: "Copy me",
      selection: "Selected text",
    };
    const usedPlaceholders = resolvePlaceholders(text, replacements);
    expect(usedPlaceholders.size).toBe(2);
    expect(usedPlaceholders.has("input")).toBe(true);
    expect(usedPlaceholders.has("clipboard")).toBe(true);
    expect(usedPlaceholders.has("selection")).toBe(false);
  });

  it("should identify placeholders with aliases", () => {
    const text = "Input: {{i}}, Selection: {{s}}, Clipboard: {{c}}";
    const replacements: SpecificReplacements = {
      input: "Input text",
      selection: "Selected text",
      clipboard: "Clipboard text",
    };
    const usedPlaceholders = resolvePlaceholders(text, replacements);
    expect(usedPlaceholders.size).toBe(3);
    expect(usedPlaceholders.has("input")).toBe(true);
    expect(usedPlaceholders.has("selection")).toBe(true);
    expect(usedPlaceholders.has("clipboard")).toBe(true);
  });

  it("should handle fallback placeholders", () => {
    const text = "Content: {{input|selection|clipboard}}";
    const replacements: SpecificReplacements = {
      selection: "Selected text",
      clipboard: "Clipboard text",
    };
    const usedPlaceholders = resolvePlaceholders(text, replacements);
    expect(usedPlaceholders.size).toBe(1);
    expect(usedPlaceholders.has("selection")).toBe(true);
    expect(usedPlaceholders.has("clipboard")).toBe(false);
    expect(usedPlaceholders.has("input")).toBe(false);
  });

  it("should use the first available placeholder in a fallback chain", () => {
    const text = "Content: {{input|selection|clipboard}}";
    const replacements: SpecificReplacements = {
      clipboard: "Clipboard text",
    };
    const usedPlaceholders = resolvePlaceholders(text, replacements);
    expect(usedPlaceholders.size).toBe(1);
    expect(usedPlaceholders.has("clipboard")).toBe(true);
  });

  it("should handle placeholders without p: prefix", () => {
    const text = "Content: {{input|selection|clipboard}}";
    const replacements: SpecificReplacements = {
      input: "Input text",
    };
    const usedPlaceholders = resolvePlaceholders(text, replacements);
    expect(usedPlaceholders.size).toBe(1);
    expect(usedPlaceholders.has("input")).toBe(true);
  });

  it("should ignore file: placeholders", () => {
    const text = "Content: {{file:path/to/file}}";
    const replacements: SpecificReplacements = {
      input: "Input text",
    };
    const usedPlaceholders = resolvePlaceholders(text, replacements);
    expect(usedPlaceholders.size).toBe(0);
  });

  it("should ignore empty string values", () => {
    const text = "Content: {{input|selection}}";
    const replacements: SpecificReplacements = {
      input: "",
      selection: "Selected text",
    };
    const usedPlaceholders = resolvePlaceholders(text, replacements);
    expect(usedPlaceholders.size).toBe(1);
    expect(usedPlaceholders.has("selection")).toBe(true);
    expect(usedPlaceholders.has("input")).toBe(false);
  });

  it("should handle multiple occurrences of the same placeholder", () => {
    const text = "Input: {{input}}, repeat: {{input}}";
    const replacements: SpecificReplacements = {
      input: "Input text",
    };
    const usedPlaceholders = resolvePlaceholders(text, replacements);
    expect(usedPlaceholders.size).toBe(1);
    expect(usedPlaceholders.has("input")).toBe(true);
  });

  it("should handle null and undefined values", () => {
    const text = "Content: {{input|selection|clipboard}}";
    const replacements = {
      input: undefined,
      selection: undefined,
    };
    const usedPlaceholders = resolvePlaceholders(text, replacements);
    expect(usedPlaceholders.size).toBe(1);
    expect(usedPlaceholders.has("clipboard")).toBe(true);
  });

  it("should handle {{i|s|c}}", () => {
    const text = "Content: {{i|s|c}}";
    const replacements: SpecificReplacements = {
      input: "",
      selection: "",
    };
    const usedPlaceholders = resolvePlaceholders(text, replacements);
    expect(usedPlaceholders.size).toBe(1);
    expect(usedPlaceholders.has("input")).toBe(false);
    expect(usedPlaceholders.has("selection")).toBe(false);
    expect(usedPlaceholders.has("clipboard")).toBe(true);

    const replacements2: SpecificReplacements = {
      input: "Input text",
      selection: "Selected text",
    };
    const usedPlaceholders2 = resolvePlaceholders(text, replacements2);
    expect(usedPlaceholders2.size).toBe(1);
    expect(usedPlaceholders2.has("input")).toBe(true);
    expect(usedPlaceholders2.has("selection")).toBe(false);
    expect(usedPlaceholders2.has("clipboard")).toBe(false);
  });

  it("should handle {{s|i}}", () => {
    const text = "Content: {{s|i}}";
    const replacements: SpecificReplacements = {
      input: "Input text",
      selection: "Selected text",
    };
    const usedPlaceholders = resolvePlaceholders(text, replacements);
    expect(usedPlaceholders.size).toBe(1);
    expect(usedPlaceholders.has("input")).toBe(false);
    expect(usedPlaceholders.has("selection")).toBe(true);
  });

  it("should ignore property placeholders in resolvePlaceholders", () => {
    const text = "Content: {{input|selection|clipboard}}, Properties: {{title}} {{icon}}";
    const replacements: SpecificReplacements = {
      input: "Input text",
    };
    const usedPlaceholders = resolvePlaceholders(text, replacements);
    expect(usedPlaceholders.size).toBe(1);
    expect(usedPlaceholders.has("input")).toBe(true);
    expect(usedPlaceholders.has("title" as never)).toBe(false);
    expect(usedPlaceholders.has("icon" as never)).toBe(false);
  });
});
