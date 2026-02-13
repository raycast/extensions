import { describe, it, expect } from "vitest";
import {
  DEFAULT_TEMPLATES,
  getDefaultTemplate,
  isBuiltInTemplate,
  getTemplatesForCategory,
  createBlankTemplate,
} from "../lib/template/defaults";
import { CaseStyle, SortField, SortDirection, TemplateDateSource } from "../types";

describe("DEFAULT_TEMPLATES", () => {
  it("has 7 entries", () => {
    expect(DEFAULT_TEMPLATES).toHaveLength(7);
  });

  it("all templates have isBuiltIn set to true", () => {
    for (const template of DEFAULT_TEMPLATES) {
      expect(template.isBuiltIn).toBe(true);
    }
  });
});

describe("getDefaultTemplate", () => {
  it("finds an existing template by id", () => {
    const template = getDefaultTemplate("builtin-photo-date-sequence");
    expect(template).toBeDefined();
    expect(template!.id).toBe("builtin-photo-date-sequence");
    expect(template!.name).toBe("Photo Date Sequence");
  });

  it("returns undefined for a non-existent id", () => {
    const template = getDefaultTemplate("nonexistent-template");
    expect(template).toBeUndefined();
  });
});

describe("isBuiltInTemplate", () => {
  it("returns true for ids starting with 'builtin-'", () => {
    expect(isBuiltInTemplate("builtin-xxx")).toBe(true);
    expect(isBuiltInTemplate("builtin-photo-date-sequence")).toBe(true);
  });

  it("returns false for ids not starting with 'builtin-'", () => {
    expect(isBuiltInTemplate("custom-xxx")).toBe(false);
    expect(isBuiltInTemplate("preset_12345_abc")).toBe(false);
  });
});

describe("getTemplatesForCategory", () => {
  it("returns photo templates for 'image' category", () => {
    const templates = getTemplatesForCategory("image");
    expect(templates).toHaveLength(2);
    expect(templates.map((t) => t.id)).toContain("builtin-photo-date-sequence");
    expect(templates.map((t) => t.id)).toContain("builtin-photo-date-original");
  });

  it("returns video templates for 'video' category", () => {
    const templates = getTemplatesForCategory("video");
    expect(templates).toHaveLength(1);
    expect(templates[0]!.id).toBe("builtin-video-organization");
  });

  it("returns audio templates for 'audio' category", () => {
    const templates = getTemplatesForCategory("audio");
    expect(templates).toHaveLength(1);
    expect(templates[0]!.id).toBe("builtin-music-track-format");
  });

  it("returns document templates for 'document' category", () => {
    const templates = getTemplatesForCategory("document");
    expect(templates).toHaveLength(2);
    expect(templates.map((t) => t.id)).toContain("builtin-document-cleanup");
    expect(templates.map((t) => t.id)).toContain("builtin-sequential-numbered");
  });

  it("returns default templates for unknown category", () => {
    const templates = getTemplatesForCategory("unknown");
    expect(templates).toHaveLength(2);
    expect(templates.map((t) => t.id)).toContain("builtin-sequential-numbered");
    expect(templates.map((t) => t.id)).toContain("builtin-timestamped-backup");
  });
});

describe("createBlankTemplate", () => {
  it("returns a valid template with correct id and name", () => {
    const template = createBlankTemplate("my-template", "My Template");
    expect(template.id).toBe("my-template");
    expect(template.name).toBe("My Template");
  });

  it("has isBuiltIn set to false", () => {
    const template = createBlankTemplate("test-id", "Test");
    expect(template.isBuiltIn).toBe(false);
  });

  it("has default values for all other fields", () => {
    const template = createBlankTemplate("test-id", "Test");
    expect(template.description).toBe("");
    expect(template.pattern).toBe("{original}_{counter:001}");
    expect(template.dateSource).toBe(TemplateDateSource.NOW);
    expect(template.counter).toEqual({ start: 1, step: 1, padding: 3 });
    expect(template.sort).toEqual({ field: SortField.NAME, direction: SortDirection.ASC });
    expect(template.transliteration).toEqual({ enabled: false, removeAccents: false });
    expect(template.caseStyle).toBe(CaseStyle.UNCHANGED);
  });
});
