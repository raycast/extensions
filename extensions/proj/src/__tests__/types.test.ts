import { describe, expect, test } from "bun:test";
import type { Collection, SourceDirectory, EnhancedProject } from "../types";
import { AUTO_COLLECTIONS } from "../types";

describe("types", () => {
  test("Collection type has required properties", () => {
    const collection: Collection = {
      id: "work",
      name: "Work",
      type: "manual",
    };
    expect(collection.id).toBe("work");
    expect(collection.name).toBe("Work");
    expect(collection.type).toBe("manual");
  });

  test("Collection type supports optional properties", () => {
    const collection: Collection = {
      id: "_recent",
      name: "Recent",
      type: "auto",
      icon: "Clock",
      color: "#1E88E5",
      criteria: { kind: "recent", days: 7 },
    };
    expect(collection.criteria?.kind).toBe("recent");
  });

  test("SourceDirectory type has required properties", () => {
    const source: SourceDirectory = {
      id: "source-1",
      path: "~/projects",
      depth: 2,
    };
    expect(source.id).toBe("source-1");
    expect(source.path).toBe("~/projects");
    expect(source.depth).toBe(2);
  });

  test("EnhancedProject extends base Project", () => {
    const project: EnhancedProject = {
      name: "my-project",
      path: "/Users/me/projects/my-project",
      relativePath: "my-project",
      collections: ["work"],
      lastOpened: Date.now(),
      sourceId: "source-1",
      detectedLang: "typescript",
      gitOrg: "acme-corp",
    };
    expect(project.collections).toContain("work");
    expect(project.sourceId).toBe("source-1");
  });

  test("AUTO_COLLECTIONS contains default auto collections", () => {
    expect(AUTO_COLLECTIONS).toBeInstanceOf(Array);
    expect(AUTO_COLLECTIONS.length).toBeGreaterThan(0);
    expect(
      AUTO_COLLECTIONS.find((c: Collection) => c.id === "_recent"),
    ).toBeDefined();
  });
});
