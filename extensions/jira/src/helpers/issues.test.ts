import { CustomFieldSchema, getCustomFieldValue } from "./issues";

// Mock @raycast/api and @raycast/utils to avoid needing the Raycast environment
// `virtual: true` is required because these packages don't expose a resolvable Node entry
// point outside of the Raycast runtime, so Jest can't resolve the real module to mock it.
jest.mock(
  "@raycast/api",
  () => ({
    Color: {
      Blue: "#0000FF",
      Yellow: "#FFFF00",
      Green: "#00FF00",
      Red: "#FF0000",
      SecondaryText: "#888888",
    },
  }),
  { virtual: true },
);

jest.mock(
  "@raycast/utils",
  () => ({
    FormValidation: {
      Required: "required",
    },
    // `../api/issues` transitively imports `../api/jiraCredentials`, which calls
    // `OAuthService.jira(...)` at module load time, so a minimal stub is needed here even
    // though this test never exercises OAuth behavior.
    OAuthService: {
      jira: () => ({}),
    },
  }),
  { virtual: true },
);

jest.mock("marklassian", () => ({
  markdownToAdf: (text: string) => ({ type: "doc", content: text }),
}));

describe("getCustomFieldValue", () => {
  describe("team field", () => {
    it("returns { id } object for team field (not a plain string)", () => {
      const result = getCustomFieldValue(CustomFieldSchema.team, "abc-123-team-uuid");
      expect(result).toEqual({ id: "abc-123-team-uuid" });
    });

    it("does not return a plain string for team field", () => {
      const result = getCustomFieldValue(CustomFieldSchema.team, "abc-123-team-uuid");
      expect(typeof result).not.toBe("string");
    });
  });

  describe("userPicker field", () => {
    it("returns { id } object", () => {
      const result = getCustomFieldValue(CustomFieldSchema.userPicker, "user-account-id");
      expect(result).toEqual({ id: "user-account-id" });
    });
  });

  describe("select field", () => {
    it("returns { id } object", () => {
      const result = getCustomFieldValue(CustomFieldSchema.select, "option-id-42");
      expect(result).toEqual({ id: "option-id-42" });
    });
  });

  describe("radioButtons field", () => {
    it("returns { id } object", () => {
      const result = getCustomFieldValue(CustomFieldSchema.radioButtons, "radio-id");
      expect(result).toEqual({ id: "radio-id" });
    });
  });

  describe("textfield field", () => {
    it("returns a plain string", () => {
      const result = getCustomFieldValue(CustomFieldSchema.textfield, "hello world");
      expect(result).toBe("hello world");
    });
  });

  describe("epicLabel field", () => {
    it("returns a plain string", () => {
      const result = getCustomFieldValue(CustomFieldSchema.epicLabel, "my-epic");
      expect(result).toBe("my-epic");
    });
  });

  describe("multiSelect field", () => {
    it("returns an array of { id } objects", () => {
      const result = getCustomFieldValue(CustomFieldSchema.multiSelect, ["id-1", "id-2", "id-3"]);
      expect(result).toEqual([{ id: "id-1" }, { id: "id-2" }, { id: "id-3" }]);
    });

    it("returns an empty array when given an empty array", () => {
      const result = getCustomFieldValue(CustomFieldSchema.multiSelect, []);
      expect(result).toEqual([]);
    });
  });

  describe("multiCheckboxes field", () => {
    it("returns an array of { id } objects", () => {
      const result = getCustomFieldValue(CustomFieldSchema.multiCheckboxes, ["a", "b"]);
      expect(result).toEqual([{ id: "a" }, { id: "b" }]);
    });
  });

  describe("float field", () => {
    it("returns a parsed integer", () => {
      const result = getCustomFieldValue(CustomFieldSchema.float, "3");
      expect(result).toBe(3);
    });
  });

  describe("storyPointEstimate field", () => {
    it("returns a parsed integer", () => {
      const result = getCustomFieldValue(CustomFieldSchema.storyPointEstimate, "8");
      expect(result).toBe(8);
    });
  });

  describe("sprint field", () => {
    it("returns a parsed integer", () => {
      const result = getCustomFieldValue(CustomFieldSchema.sprint, "42");
      expect(result).toBe(42);
    });
  });

  describe("unknown field", () => {
    it("returns null for unknown schema", () => {
      const result = getCustomFieldValue(CustomFieldSchema.unknown, "anything");
      expect(result).toBeNull();
    });
  });
});
