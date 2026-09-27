import { expect, test } from "bun:test";
import { modelTitle } from "../src/model-title";

test.each([
  ["mistral-medium-3-5", "Mistral Medium 3.5"],
  ["zai-glm-5-3", "GLM 5.3"],
  ["mistral-large-latest", "Mistral Large (Latest)"],
  ["mistral-small-2603", "Mistral Small (2603)"],
  ["ministral-8b-2512", "Ministral 8B (2512)"],
  ["open-mistral-nemo", "Open Mistral NeMo"],
  ["mistral-code-fim-latest", "Mistral Code FIM (Latest)"],
  ["mixtral-8x7b-instruct", "Mixtral 8x7B Instruct"],
  ["ft:custom:model-id", "ft:custom:model-id"],
])("formats %s as %s", (id, title) => {
  expect(modelTitle(id)).toBe(title);
});

test("preserves upstream display names and falls back from empty names", () => {
  expect(modelTitle("custom-model", "  My Custom Model  ")).toBe("My Custom Model");
  expect(modelTitle("mistral-large-latest", " ")).toBe("Mistral Large (Latest)");
});
