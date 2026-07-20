import { expect, test } from "vitest";
import { templateMap } from "../api/templating/templates";
import { applyTemplates } from "../api/templating/templating.service";

test("should apply all templates", async () => {
  const allTemplates = Array.from(templateMap.keys()).join("\n");
  const result = await applyTemplates(allTemplates);
  expect(result).toBeDefined();
  expect(result).toBeTypeOf("string");

  // Verify each template was replaced (not just with the placeholder)
  for (const placeholder of templateMap.keys()) {
    expect(result).not.toContain(placeholder);
  }
});
