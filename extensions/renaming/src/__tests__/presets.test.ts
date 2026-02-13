import { describe, it, expect, vi, beforeEach } from "vitest";
import { LocalStorage } from "@raycast/api";
import {
  getPresets,
  savePreset,
  updatePreset,
  deletePreset,
  getPresetById,
  templateToConfig,
  configToTemplate,
  DEFAULT_PRESETS,
  DEFAULT_TEMPLATE_PRESETS,
  getAllDefaultPresets,
  isTemplatePreset,
  type RenamePreset,
} from "../lib/presets";
import { CaseStyle, SortField, SortDirection, TemplateDateSource, type NamingTemplate } from "../types";

const mockStorage = LocalStorage as {
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getPresets", () => {
  it("returns empty array when no data stored", async () => {
    mockStorage.getItem.mockResolvedValue(null);
    const result = await getPresets();
    expect(result).toEqual([]);
  });

  it("parses stored JSON data", async () => {
    const presets = [{ id: "p1", name: "Test", createdAt: 1000, config: {} }];
    mockStorage.getItem.mockResolvedValue(JSON.stringify(presets));
    const result = await getPresets();
    expect(result).toEqual(presets);
  });

  it("returns empty array on invalid JSON", async () => {
    mockStorage.getItem.mockResolvedValue("bad json");
    const result = await getPresets();
    expect(result).toEqual([]);
  });
});

describe("savePreset", () => {
  it("generates id and createdAt, stores in LocalStorage", async () => {
    mockStorage.getItem.mockResolvedValue("[]");

    const result = await savePreset({ name: "My Preset", config: {} });

    expect(result.id).toMatch(/^preset_/);
    expect(result.createdAt).toBeGreaterThan(0);
    expect(result.name).toBe("My Preset");
    expect(mockStorage.setItem).toHaveBeenCalledOnce();
  });
});

describe("updatePreset", () => {
  const existing = [{ id: "p1", name: "Old", createdAt: 1000, config: {} }];

  it("updates existing preset and returns true", async () => {
    mockStorage.getItem.mockResolvedValue(JSON.stringify(existing));
    const result = await updatePreset("p1", { name: "New" });
    expect(result).toBe(true);
    const stored = JSON.parse(mockStorage.setItem.mock.calls[0][1]);
    expect(stored[0].name).toBe("New");
  });

  it("returns false for non-existent preset", async () => {
    mockStorage.getItem.mockResolvedValue(JSON.stringify(existing));
    const result = await updatePreset("nonexistent", { name: "New" });
    expect(result).toBe(false);
  });
});

describe("deletePreset", () => {
  const existing = [
    { id: "p1", name: "One", createdAt: 1000, config: {} },
    { id: "p2", name: "Two", createdAt: 2000, config: {} },
  ];

  it("removes preset and returns true", async () => {
    mockStorage.getItem.mockResolvedValue(JSON.stringify(existing));
    const result = await deletePreset("p1");
    expect(result).toBe(true);
    const stored = JSON.parse(mockStorage.setItem.mock.calls[0][1]);
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe("p2");
  });

  it("returns false for non-existent preset", async () => {
    mockStorage.getItem.mockResolvedValue(JSON.stringify(existing));
    const result = await deletePreset("nonexistent");
    expect(result).toBe(false);
  });
});

describe("getPresetById", () => {
  const existing = [{ id: "p1", name: "Test", createdAt: 1000, config: {} }];

  it("finds preset by id", async () => {
    mockStorage.getItem.mockResolvedValue(JSON.stringify(existing));
    const result = await getPresetById("p1");
    expect(result).toBeDefined();
    expect(result!.name).toBe("Test");
  });

  it("returns null for non-existent preset", async () => {
    mockStorage.getItem.mockResolvedValue(JSON.stringify(existing));
    const result = await getPresetById("nonexistent");
    expect(result).toBeNull();
  });
});

describe("templateToConfig", () => {
  it("extracts config fields from NamingTemplate", () => {
    const template: NamingTemplate = {
      id: "t1",
      name: "Test",
      pattern: "{original}",
      dateSource: TemplateDateSource.NOW,
      counter: { start: 1, step: 1, padding: 3 },
      sort: { field: SortField.NAME, direction: SortDirection.ASC },
      transliteration: { enabled: false, removeAccents: false },
      caseStyle: CaseStyle.UNCHANGED,
      isBuiltIn: false,
    };

    const config = templateToConfig(template);
    expect(config.pattern).toBe("{original}");
    expect(config.dateSource).toBe(TemplateDateSource.NOW);
    expect(config.counter).toEqual({ start: 1, step: 1, padding: 3 });
    expect(config.sort).toEqual({ field: SortField.NAME, direction: SortDirection.ASC });
  });
});

describe("configToTemplate", () => {
  it("creates NamingTemplate from config and preset", () => {
    const config = {
      pattern: "{original}",
      dateSource: TemplateDateSource.NOW,
      counter: { start: 1, step: 1, padding: 3 },
      sort: { field: SortField.NAME, direction: SortDirection.ASC },
      transliteration: { enabled: false, removeAccents: false },
      caseStyle: CaseStyle.UNCHANGED,
    };
    const preset: RenamePreset = {
      id: "p1",
      name: "My Preset",
      description: "Desc",
      createdAt: 1000,
      config: { template: config },
    };

    const template = configToTemplate(config, preset);
    expect(template.id).toBe("p1");
    expect(template.name).toBe("My Preset");
    expect(template.pattern).toBe("{original}");
    expect(template.isBuiltIn).toBe(false);
  });
});

describe("DEFAULT_PRESETS", () => {
  it("is a non-empty array", () => {
    expect(DEFAULT_PRESETS.length).toBeGreaterThan(0);
  });
});

describe("DEFAULT_TEMPLATE_PRESETS", () => {
  it("is a non-empty array", () => {
    expect(DEFAULT_TEMPLATE_PRESETS.length).toBeGreaterThan(0);
  });
});

describe("getAllDefaultPresets", () => {
  it("returns combined arrays", () => {
    const all = getAllDefaultPresets();
    expect(all.length).toBe(DEFAULT_PRESETS.length + DEFAULT_TEMPLATE_PRESETS.length);
  });
});

describe("isTemplatePreset", () => {
  it("returns true for template presets", () => {
    const preset: RenamePreset = {
      id: "p1",
      name: "Test",
      createdAt: 1000,
      type: "template",
      config: {
        template: {
          pattern: "{original}",
          dateSource: TemplateDateSource.NOW,
          counter: { start: 1, step: 1, padding: 3 },
          sort: { field: SortField.NAME, direction: SortDirection.ASC },
          transliteration: { enabled: false, removeAccents: false },
          caseStyle: CaseStyle.UNCHANGED,
        },
      },
    };
    expect(isTemplatePreset(preset)).toBe(true);
  });

  it("returns false for non-template presets", () => {
    const preset: RenamePreset = { id: "p1", name: "Test", createdAt: 1000, type: "rename", config: {} };
    expect(isTemplatePreset(preset)).toBe(false);
  });
});
