import { serializeEntries, deserializeEntries, SerializableEntry } from "../serialization";
import { DocEntry } from "../../types/DocEntry";

describe("serialization", () => {
  describe("serializeEntries", () => {
    it("should convert DocEntry to SerializableEntry format", () => {
      const entry: DocEntry = {
        url: "https://example.com/page",
        title: "Page Title",
        content: "Page content",
        parent: null,
        previous: null,
        next: null,
      };

      const result = serializeEntries([entry]);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        url: "https://example.com/page",
        title: "Page Title",
        content: "Page content",
        parentUrl: null,
        previousUrl: null,
        nextUrl: null,
      });
    });

    it("should serialize parent reference as URL", () => {
      const parent: DocEntry = {
        url: "https://example.com/parent",
        title: "Parent",
        content: "Parent content",
        parent: null,
        previous: null,
        next: null,
      };

      const child: DocEntry = {
        url: "https://example.com/child",
        title: "Child",
        content: "Child content",
        parent: parent,
        previous: null,
        next: null,
      };

      const result = serializeEntries([parent, child]);

      expect(result[0].parentUrl).toBeNull();
      expect(result[1].parentUrl).toBe("https://example.com/parent");
    });

    it("should serialize previous and next references as URLs", () => {
      const entry1: DocEntry = {
        url: "https://example.com/page1",
        title: "Page 1",
        content: "Content 1",
        parent: null,
        previous: null,
        next: null,
      };

      const entry2: DocEntry = {
        url: "https://example.com/page2",
        title: "Page 2",
        content: "Content 2",
        parent: null,
        previous: entry1,
        next: null,
      };

      entry1.next = entry2;

      const result = serializeEntries([entry1, entry2]);

      expect(result[0].previousUrl).toBeNull();
      expect(result[0].nextUrl).toBe("https://example.com/page2");
      expect(result[1].previousUrl).toBe("https://example.com/page1");
      expect(result[1].nextUrl).toBeNull();
    });

    it("should handle empty array", () => {
      const result = serializeEntries([]);

      expect(result).toEqual([]);
    });

    it("should serialize all relationships for complex hierarchy", () => {
      const grandparent: DocEntry = {
        url: "https://example.com/grandparent",
        title: "Grandparent",
        content: "Grandparent content",
        parent: null,
        previous: null,
        next: null,
      };

      const parent: DocEntry = {
        url: "https://example.com/parent",
        title: "Parent",
        content: "Parent content",
        parent: grandparent,
        previous: null,
        next: null,
      };

      const child: DocEntry = {
        url: "https://example.com/child",
        title: "Child",
        content: "Child content",
        parent: parent,
        previous: null,
        next: null,
      };

      const result = serializeEntries([grandparent, parent, child]);

      expect(result[0].parentUrl).toBeNull();
      expect(result[1].parentUrl).toBe("https://example.com/grandparent");
      expect(result[2].parentUrl).toBe("https://example.com/parent");
    });
  });

  describe("deserializeEntries", () => {
    it("should convert SerializableEntry to DocEntry format", () => {
      const serialized: SerializableEntry[] = [
        {
          url: "https://example.com/page",
          title: "Page Title",
          content: "Page content",
          parentUrl: null,
          previousUrl: null,
          nextUrl: null,
        },
      ];

      const result = deserializeEntries(serialized);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        url: "https://example.com/page",
        title: "Page Title",
        content: "Page content",
        parent: null,
        previous: null,
        next: null,
      });
    });

    it("should restore parent references from URLs", () => {
      const serialized: SerializableEntry[] = [
        {
          url: "https://example.com/parent",
          title: "Parent",
          content: "Parent content",
          parentUrl: null,
          previousUrl: null,
          nextUrl: null,
        },
        {
          url: "https://example.com/child",
          title: "Child",
          content: "Child content",
          parentUrl: "https://example.com/parent",
          previousUrl: null,
          nextUrl: null,
        },
      ];

      const result = deserializeEntries(serialized);

      expect(result[0].parent).toBeNull();
      expect(result[1].parent).toBe(result[0]);
      expect(result[1].parent?.url).toBe("https://example.com/parent");
    });

    it("should restore previous and next references from URLs", () => {
      const serialized: SerializableEntry[] = [
        {
          url: "https://example.com/page1",
          title: "Page 1",
          content: "Content 1",
          parentUrl: null,
          previousUrl: null,
          nextUrl: "https://example.com/page2",
        },
        {
          url: "https://example.com/page2",
          title: "Page 2",
          content: "Content 2",
          parentUrl: null,
          previousUrl: "https://example.com/page1",
          nextUrl: null,
        },
      ];

      const result = deserializeEntries(serialized);

      expect(result[0].previous).toBeNull();
      expect(result[0].next).toBe(result[1]);
      expect(result[1].previous).toBe(result[0]);
      expect(result[1].next).toBeNull();
    });

    it("should handle empty array", () => {
      const result = deserializeEntries([]);

      expect(result).toEqual([]);
    });

    it("should set null for missing referenced URLs", () => {
      const serialized: SerializableEntry[] = [
        {
          url: "https://example.com/page",
          title: "Page",
          content: "Content",
          parentUrl: "https://example.com/nonexistent",
          previousUrl: "https://example.com/also-nonexistent",
          nextUrl: "https://example.com/missing-too",
        },
      ];

      const result = deserializeEntries(serialized);

      expect(result[0].parent).toBeNull();
      expect(result[0].previous).toBeNull();
      expect(result[0].next).toBeNull();
    });

    it("should create proper object references for circular structures", () => {
      const serialized: SerializableEntry[] = [
        {
          url: "https://example.com/page1",
          title: "Page 1",
          content: "Content 1",
          parentUrl: null,
          previousUrl: null,
          nextUrl: "https://example.com/page2",
        },
        {
          url: "https://example.com/page2",
          title: "Page 2",
          content: "Content 2",
          parentUrl: null,
          previousUrl: "https://example.com/page1",
          nextUrl: null,
        },
      ];

      const result = deserializeEntries(serialized);

      // Verify circular references are actual object references
      expect(result[0].next).toBe(result[1]);
      expect(result[1].previous).toBe(result[0]);

      // Modifying one should affect the other
      result[0].title = "Modified Page 1";
      expect(result[1].previous?.title).toBe("Modified Page 1");
    });

    it("should restore complex hierarchies", () => {
      const serialized: SerializableEntry[] = [
        {
          url: "https://example.com/grandparent",
          title: "Grandparent",
          content: "Grandparent content",
          parentUrl: null,
          previousUrl: null,
          nextUrl: null,
        },
        {
          url: "https://example.com/parent",
          title: "Parent",
          content: "Parent content",
          parentUrl: "https://example.com/grandparent",
          previousUrl: null,
          nextUrl: null,
        },
        {
          url: "https://example.com/child",
          title: "Child",
          content: "Child content",
          parentUrl: "https://example.com/parent",
          previousUrl: null,
          nextUrl: null,
        },
      ];

      const result = deserializeEntries(serialized);

      expect(result[0].parent).toBeNull();
      expect(result[1].parent).toBe(result[0]);
      expect(result[2].parent).toBe(result[1]);
      expect(result[2].parent?.parent).toBe(result[0]);
    });
  });

  describe("round-trip serialization", () => {
    it("should preserve data through serialize/deserialize cycle", () => {
      const entry: DocEntry = {
        url: "https://example.com/page",
        title: "Page Title",
        content: "Page content with special chars: <>&\"'",
        parent: null,
        previous: null,
        next: null,
      };

      const serialized = serializeEntries([entry]);
      const deserialized = deserializeEntries(serialized);

      expect(deserialized[0].url).toBe(entry.url);
      expect(deserialized[0].title).toBe(entry.title);
      expect(deserialized[0].content).toBe(entry.content);
    });

    it("should preserve parent references through round-trip", () => {
      const parent: DocEntry = {
        url: "https://example.com/parent",
        title: "Parent",
        content: "Parent content",
        parent: null,
        previous: null,
        next: null,
      };

      const child: DocEntry = {
        url: "https://example.com/child",
        title: "Child",
        content: "Child content",
        parent: parent,
        previous: null,
        next: null,
      };

      const serialized = serializeEntries([parent, child]);
      const deserialized = deserializeEntries(serialized);

      expect(deserialized[1].parent).toBe(deserialized[0]);
      expect(deserialized[1].parent?.title).toBe("Parent");
    });

    it("should preserve navigation references through round-trip", () => {
      const entry1: DocEntry = {
        url: "https://example.com/page1",
        title: "Page 1",
        content: "Content 1",
        parent: null,
        previous: null,
        next: null,
      };

      const entry2: DocEntry = {
        url: "https://example.com/page2",
        title: "Page 2",
        content: "Content 2",
        parent: null,
        previous: entry1,
        next: null,
      };

      entry1.next = entry2;

      const serialized = serializeEntries([entry1, entry2]);
      const deserialized = deserializeEntries(serialized);

      expect(deserialized[0].next).toBe(deserialized[1]);
      expect(deserialized[1].previous).toBe(deserialized[0]);
    });

    it("should handle large arrays", () => {
      const entries: DocEntry[] = Array.from({ length: 100 }, (_, i) => ({
        url: `https://example.com/page${i}`,
        title: `Page ${i}`,
        content: `Content ${i}`,
        parent: null,
        previous: null,
        next: null,
      }));

      // Link entries
      for (let i = 0; i < entries.length - 1; i++) {
        entries[i].next = entries[i + 1];
        entries[i + 1].previous = entries[i];
      }

      const serialized = serializeEntries(entries);
      const deserialized = deserializeEntries(serialized);

      expect(deserialized).toHaveLength(100);
      expect(deserialized[0].next).toBe(deserialized[1]);
      expect(deserialized[99].previous).toBe(deserialized[98]);
    });
  });
});
