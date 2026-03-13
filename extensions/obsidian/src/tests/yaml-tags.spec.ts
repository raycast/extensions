import { describe, it, expect } from "vitest";
import {
  yamlTagsForString,
  inlineTagsForString,
  tagsForString,
  parsedYAMLFrontmatter,
  yamlPropertyForString,
  tagsForNotes,
} from "@/obsidian/internal/yaml";
import { NoteWithContent } from "@/obsidian/internal/notes";

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

    it("should handle tag (singular) property as array", () => {
      const content = `---
tag: [work, important]
---

Content`;

      const tags = yamlTagsForString(content);
      expect(tags).toContain("work");
      expect(tags).toContain("important");
      expect(tags.length).toBe(2);
    });

    it("should handle tag (singular) property as comma-separated string", () => {
      const content = `---
tag: work, important, urgent
---

Content`;

      const tags = yamlTagsForString(content);
      expect(tags).toContain("work");
      expect(tags).toContain("important");
      expect(tags).toContain("urgent");
      expect(tags.length).toBe(3);
    });

    it("should return empty array for content without YAML", () => {
      const content = "Just some content without YAML frontmatter #tag";
      const tags = yamlTagsForString(content);
      expect(tags).toEqual([]);
    });

    it("should filter out empty tags", () => {
      const content = `---
tags: work, , important,
---

Content`;

      const tags = yamlTagsForString(content);
      expect(tags).toContain("work");
      expect(tags).toContain("important");
      expect(tags.length).toBe(2);
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

    it("should return sorted tags", () => {
      const content = `---
tags:
  - zebra
  - apple
---

Content with #banana and #cherry tags.`;

      const tags = tagsForString(content);
      expect(tags).toEqual(["apple", "banana", "cherry", "zebra"]);
    });
  });

  describe("parsedYAMLFrontmatter", () => {
    it("should parse valid YAML frontmatter", () => {
      const content = `---
title: My Note
tags: [work, important]
---

Content`;

      const yaml = parsedYAMLFrontmatter(content);
      expect(yaml).toBeDefined();
      expect(yaml.title).toBe("My Note");
      expect(yaml.tags).toEqual(["work", "important"]);
    });

    it("should return undefined for content without frontmatter", () => {
      const content = "Just regular content without frontmatter";
      const yaml = parsedYAMLFrontmatter(content);
      expect(yaml).toBeUndefined();
    });

    it("should handle invalid YAML gracefully", () => {
      const content = `---
title: My Note
invalid: [unclosed bracket
---

Content`;

      const yaml = parsedYAMLFrontmatter(content);
      // Should return undefined when YAML parsing fails (catch block)
      expect(yaml).toBeUndefined();
    });
  });

  describe("yamlPropertyForString", () => {
    it("should extract specific property from YAML", () => {
      const content = `---
title: My Note
author: John Doe
---

Content`;

      const title = yamlPropertyForString(content, "title");
      const author = yamlPropertyForString(content, "author");

      expect(title).toBe("My Note");
      expect(author).toBe("John Doe");
    });

    it("should return undefined for non-existent property", () => {
      const content = `---
title: My Note
---

Content`;

      const result = yamlPropertyForString(content, "nonexistent");
      expect(result).toBeUndefined();
    });

    it("should return undefined for content without YAML", () => {
      const content = "Just regular content";
      const result = yamlPropertyForString(content, "title");
      expect(result).toBeUndefined();
    });

    it("should return undefined for falsy property values", () => {
      const content = `---
title: My Note
empty:
---

Content`;

      const result = yamlPropertyForString(content, "empty");
      expect(result).toBeUndefined();
    });
  });

  describe("tagsForNotes", () => {
    it("should extract tags from multiple notes with YAML and inline tags", () => {
      const notes: NoteWithContent[] = [
        {
          title: "Note 1",
          path: "/path/note1.md",
          content: `---
tags: [work, important]
---

Content with #todo tag`,
          lastModified: new Date(),
          bookmarked: false,
        },
        {
          title: "Note 2",
          path: "/path/note2.md",
          content: `---
tags: [personal]
---

Content with #shopping tag`,
          lastModified: new Date(),
          bookmarked: false,
        },
      ];

      const tags = tagsForNotes(notes);
      expect(tags).toContain("work");
      expect(tags).toContain("important");
      expect(tags).toContain("todo");
      expect(tags).toContain("personal");
      expect(tags).toContain("shopping");
    });

    it("should not duplicate tags across notes", () => {
      const notes: NoteWithContent[] = [
        {
          title: "Note 1",
          path: "/path/note1.md",
          content: `---
tags: [work]
---

Content with #work tag`,
          lastModified: new Date(),
          bookmarked: false,
        },
        {
          title: "Note 2",
          path: "/path/note2.md",
          content: "#work and #important",
          lastModified: new Date(),
          bookmarked: false,
        },
      ];

      const tags = tagsForNotes(notes);
      expect(tags.filter((t) => t === "work").length).toBe(1);
      expect(tags).toContain("important");
    });

    it("should return sorted tags", () => {
      const notes: NoteWithContent[] = [
        {
          title: "Note 1",
          path: "/path/note1.md",
          content: "#zebra #apple",
          lastModified: new Date(),
          bookmarked: false,
        },
        {
          title: "Note 2",
          path: "/path/note2.md",
          content: "#banana #cherry",
          lastModified: new Date(),
          bookmarked: false,
        },
      ];

      const tags = tagsForNotes(notes);
      expect(tags).toEqual(["apple", "banana", "cherry", "zebra"]);
    });

    it("should ignore tags in code blocks", () => {
      const notes: NoteWithContent[] = [
        {
          title: "Note 1",
          path: "/path/note1.md",
          content: `Here is a real #tag

\`\`\`javascript
// This #codeTag should be ignored
const color = "#FF5733";
\`\`\`

Another real #tag2`,
          lastModified: new Date(),
          bookmarked: false,
        },
      ];

      const tags = tagsForNotes(notes);
      expect(tags).toContain("tag");
      expect(tags).toContain("tag2");
      expect(tags).not.toContain("codeTag");
      expect(tags).not.toContain("FF5733");
    });

    it("should handle empty notes array", () => {
      const notes: NoteWithContent[] = [];
      const tags = tagsForNotes(notes);
      expect(tags).toEqual([]);
    });

    it("should handle notes without tags", () => {
      const notes: NoteWithContent[] = [
        {
          title: "Note 1",
          path: "/path/note1.md",
          content: "Just regular content without any tags",
          lastModified: new Date(),
          bookmarked: false,
        },
      ];

      const tags = tagsForNotes(notes);
      expect(tags).toEqual([]);
    });
  });
});
