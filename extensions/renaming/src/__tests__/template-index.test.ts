import { describe, it, expect, vi } from "vitest";

vi.mock("../lib/os-capabilities", () => ({
  isPreviewableImage: () => false,
}));

import {
  applyTemplate,
  processFilesWithTemplate,
  previewTemplate,
  getTemplateRequirements,
  validateNamingTemplate,
  generateSampleOutput,
} from "../lib/template/index";
import { MOCK_JPG, MOCK_PNG, MOCK_PDF } from "./fixtures/files";
import { SortField, SortDirection, CaseStyle, TemplateDateSource, type NamingTemplate } from "../types";

const testTemplate: NamingTemplate = {
  id: "test",
  name: "Test",
  description: "",
  pattern: "{original}_{counter:001}",
  dateSource: TemplateDateSource.NOW,
  counter: { start: 1, step: 1, padding: 3 },
  sort: { field: SortField.NAME, direction: SortDirection.ASC },
  transliteration: { enabled: false, removeAccents: false },
  caseStyle: CaseStyle.UNCHANGED,
  isBuiltIn: false,
};

describe("applyTemplate", () => {
  it("resolves {original} and {counter}", () => {
    const result = applyTemplate(testTemplate, MOCK_JPG, 0, 3);
    expect(result).toBe("photo_001");
  });

  it("applies counter with correct index", () => {
    const result = applyTemplate(testTemplate, MOCK_JPG, 2, 3);
    expect(result).toBe("photo_003");
  });

  it("applies case transformation when set", () => {
    const lowerTemplate = { ...testTemplate, caseStyle: CaseStyle.LOWERCASE };
    const mixedCaseFile = { ...MOCK_JPG, baseName: "Photo" };
    const result = applyTemplate(lowerTemplate, mixedCaseFile, 0, 1);
    expect(result).toBe("photo_001");
  });

  it("applies transliteration when enabled", () => {
    const transTemplate = { ...testTemplate, transliteration: { enabled: true, removeAccents: true } };
    const accentedFile = { ...MOCK_JPG, baseName: "café", name: "café.jpg" };
    const result = applyTemplate(transTemplate, accentedFile, 0, 1);
    expect(result).toBe("cafe_001");
  });
});

describe("processFilesWithTemplate", () => {
  it("returns RenameOperation[] with oldPath and newPath", () => {
    const files = [{ file: MOCK_JPG }, { file: MOCK_PNG }];
    const ops = processFilesWithTemplate(testTemplate, files);
    expect(ops).toHaveLength(2);
    expect(ops[0]!.oldPath).toBe(MOCK_JPG.path);
    expect(ops[0]!.newName).toContain(".jpg");
    expect(ops[0]!.newPath).toContain("/");
  });

  it("sorts files per template config", () => {
    const nameSort = { ...testTemplate, sort: { field: SortField.NAME, direction: SortDirection.ASC } };
    const files = [{ file: MOCK_PNG }, { file: MOCK_JPG }];
    const ops = processFilesWithTemplate(nameSort, files);
    // photo.jpg sorts before screenshot.png
    expect(ops[0]!.oldPath).toBe(MOCK_JPG.path);
  });
});

describe("previewTemplate", () => {
  it("respects limit parameter", () => {
    const files = [{ file: MOCK_JPG }, { file: MOCK_PNG }, { file: MOCK_PDF }];
    const ops = previewTemplate(testTemplate, files, 2);
    expect(ops).toHaveLength(2);
  });
});

describe("getTemplateRequirements", () => {
  it("detects EXIF requirements", () => {
    const exifTemplate = { ...testTemplate, pattern: "{exif.dateTaken:YYYY-MM-DD}_{counter:001}" };
    const reqs = getTemplateRequirements(exifTemplate);
    expect(reqs.needsExif).toBe(true);
    expect(reqs.needsMetadata).toBe(true);
  });

  it("detects Spotlight requirements", () => {
    const spotlightTemplate = { ...testTemplate, pattern: "{spotlight.artist}_{counter:001}" };
    const reqs = getTemplateRequirements(spotlightTemplate);
    expect(reqs.needsSpotlight).toBe(true);
    expect(reqs.needsMetadata).toBe(true);
  });

  it("detects file stats requirements", () => {
    const fileTemplate = { ...testTemplate, pattern: "{file.modified:YYYY-MM-DD}_{counter:001}" };
    const reqs = getTemplateRequirements(fileTemplate);
    expect(reqs.needsFileStats).toBe(true);
    expect(reqs.needsMetadata).toBe(true);
  });

  it("returns no requirements for simple template", () => {
    const reqs = getTemplateRequirements(testTemplate);
    expect(reqs.needsExif).toBe(false);
    expect(reqs.needsSpotlight).toBe(false);
  });
});

describe("validateNamingTemplate", () => {
  it("returns valid for good template", () => {
    const result = validateNamingTemplate(testTemplate);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("errors for invalid counter settings", () => {
    const badTemplate = { ...testTemplate, counter: { start: 1, step: 0, padding: 0 } };
    const result = validateNamingTemplate(badTemplate);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("warns when no counter or original in pattern", () => {
    const noCounterTemplate = { ...testTemplate, pattern: "{date:YYYY-MM-DD}" };
    const result = validateNamingTemplate(noCounterTemplate);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe("generateSampleOutput", () => {
  it("returns non-empty string", () => {
    const result = generateSampleOutput(testTemplate);
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain(".jpg");
  });
});
