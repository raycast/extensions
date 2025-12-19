import { describe, it, expect } from "vitest";
import { yamlTagsForString, inlineTagsForString, tagsForString } from "@/obsidian/internal/yaml";

describe("YAML tag extraction", () => {
  describe("yamlTagsForString", () => {
    it("should extract tags from YAML list format", () => {
      const content = `---
tags:
  - work
  - important
category: personal
---

Some content here`;

      const tags = yamlTagsForString(content);
      expect(tags).toContain("work");
      expect(tags).toContain("important");
      expect(tags).not.toContain("#work");
      expect(tags.length).toBe(2);
    });

    it("should extract tags from YAML inline array format", () => {
      const content = `---
tags: [work, important, urgent]
---

Content`;

      const tags = yamlTagsForString(content);
      expect(tags).toContain("work");
      expect(tags).toContain("important");
      expect(tags).toContain("urgent");
      expect(tags.length).toBe(3);
    });

    it("should extract tags from YAML comma-separated string", () => {
      const content = `---
tags: work, important, urgent
---

Content`;

      const tags = yamlTagsForString(content);
      expect(tags).toContain("work");
      expect(tags).toContain("important");
      expect(tags).toContain("urgent");
      expect(tags.length).toBe(3);
    });

    it("should handle tag (singular) property", () => {
      const content = `---
tag: work
---

Content`;

      const tags = yamlTagsForString(content);
      expect(tags).toContain("work");
      expect(tags.length).toBe(1);
    });
  });

  describe("inlineTagsForString", () => {
    it("should extract inline tags without # prefix", () => {
      const content = "This is a note with #todo and #work/important tags.";

      const tags = inlineTagsForString(content);
      expect(tags).toContain("todo");
      expect(tags).toContain("work/important");
      expect(tags).not.toContain("#todo");
      expect(tags.length).toBe(2);
    });
  });

  describe("tagsForString", () => {
    it("should combine YAML and inline tags without duplicates", () => {
      const content = `---
tags:
  - work
  - important
---

This is a note with #todo and #work tags.`;

      const tags = tagsForString(content);
      expect(tags).toContain("work");
      expect(tags).toContain("important");
      expect(tags).toContain("todo");
      // work should only appear once (no duplicate)
      expect(tags.filter((t) => t === "work").length).toBe(1);
    });
  });
});
