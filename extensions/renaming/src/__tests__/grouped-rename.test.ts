import { describe, it, expect } from "vitest";
import { groupFilesByExtension } from "../lib/selection-summary";
import { CaseStyle, type FileInfo, type ExtensionGroupConfig, type GroupedRenameGlobalConfig } from "../types";
import { transformCase } from "../lib/case-transform";
import { dirname } from "path";
import { MOCK_JPG, MOCK_PNG, MOCK_PDF, MOCK_DIR } from "./fixtures/files";

// ── Inline implementation of generateGroupedName for unit testing ────
// Tests the core per-extension grouping logic used by the rename form

function generateGroupedName(
  file: FileInfo,
  indexInGroup: number,
  extension: string,
  groupConfigs: Map<string, ExtensionGroupConfig>,
  globalConfig: GroupedRenameGlobalConfig,
  extensionGroups: Map<string, FileInfo[]>,
): string {
  const groupConfig = groupConfigs.get(extension);
  const baseName = groupConfig?.baseName || file.baseName;

  const effectivePrefix = groupConfig?.prefix ?? globalConfig.prefix;
  const effectiveSuffix = groupConfig?.suffix ?? globalConfig.suffix;
  const effectiveSep = groupConfig?.separator ?? globalConfig.separator;
  const effectiveIdxSep = groupConfig?.indexSeparator ?? globalConfig.indexSeparator;
  const effectiveStart = groupConfig?.startNumber ?? globalConfig.startNumber;
  const effectivePadding = groupConfig?.paddingDigits ?? globalConfig.paddingDigits;
  const effectiveCase = groupConfig?.caseStyle ?? globalConfig.caseStyle;

  const groupSize = extensionGroups.get(extension)?.length ?? 1;
  const totalDigits = effectivePadding === 0 ? String(groupSize).length : effectivePadding;
  const paddedIndex = String(effectiveStart + indexInGroup).padStart(totalDigits, "0");

  const prefixPart = effectivePrefix ? `${effectivePrefix}${effectiveSep}` : "";
  const suffixPart = effectiveSuffix ? `${effectiveSep}${effectiveSuffix}` : "";

  let newBaseName: string;
  if (groupSize === 1) {
    newBaseName = `${prefixPart}${baseName}${suffixPart}`;
  } else {
    newBaseName = `${prefixPart}${baseName}${effectiveIdxSep}${paddedIndex}${suffixPart}`;
  }

  newBaseName = transformCase(newBaseName, effectiveCase);
  return file.isDirectory ? newBaseName : `${newBaseName}${file.extension}`;
}

function getAllOperations(
  extensionGroups: Map<string, FileInfo[]>,
  groupConfigs: Map<string, ExtensionGroupConfig>,
  globalConfig: GroupedRenameGlobalConfig,
) {
  const operations: { oldPath: string; newName: string; newPath: string }[] = [];
  for (const [ext, groupFiles] of extensionGroups) {
    for (let i = 0; i < groupFiles.length; i++) {
      const file = groupFiles[i]!;
      const newFileName = generateGroupedName(file, i, ext, groupConfigs, globalConfig, extensionGroups);
      operations.push({
        oldPath: file.path,
        newName: newFileName,
        newPath: `${dirname(file.path)}/${newFileName}`,
      });
    }
  }
  return operations;
}

const DEFAULT_GLOBAL: GroupedRenameGlobalConfig = {
  separator: "_",
  indexSeparator: "-",
  startNumber: 1,
  paddingDigits: 0,
  caseStyle: CaseStyle.UNCHANGED,
  prefix: "",
  suffix: "",
};

// ── Tests ────────────────────────────────────────────────────────────

describe("groupFilesByExtension", () => {
  it("groups files by extension", () => {
    const groups = groupFilesByExtension([MOCK_JPG, MOCK_PNG, MOCK_PDF]);
    expect(groups.size).toBe(3);
    expect(groups.get(".jpg")).toEqual([MOCK_JPG]);
    expect(groups.get(".png")).toEqual([MOCK_PNG]);
    expect(groups.get(".pdf")).toEqual([MOCK_PDF]);
  });

  it("groups multiple files with same extension", () => {
    const jpg2: FileInfo = { ...MOCK_JPG, path: "/tmp/test/photo2.jpg", name: "photo2.jpg", baseName: "photo2" };
    const groups = groupFilesByExtension([MOCK_JPG, jpg2, MOCK_PNG]);
    expect(groups.get(".jpg")).toHaveLength(2);
    expect(groups.get(".png")).toHaveLength(1);
  });

  it("normalizes extensions to lowercase", () => {
    const upperJpg: FileInfo = { ...MOCK_JPG, extension: ".JPG", name: "photo.JPG", path: "/tmp/test/photo.JPG" };
    const groups = groupFilesByExtension([upperJpg, MOCK_PNG]);
    expect(groups.has(".jpg")).toBe(true);
    expect(groups.has(".JPG")).toBe(false);
  });

  it("skips directories", () => {
    const groups = groupFilesByExtension([MOCK_DIR]);
    expect(groups.size).toBe(0);
  });

  it("returns empty map for empty input", () => {
    const groups = groupFilesByExtension([]);
    expect(groups.size).toBe(0);
  });
});

describe("generateGroupedName", () => {
  it("uses baseName from group config (single-file groups, no counter)", () => {
    const groups = groupFilesByExtension([MOCK_JPG, MOCK_PNG]);
    const configs = new Map<string, ExtensionGroupConfig>([
      [".jpg", { extension: ".jpg", baseName: "photo" }],
      [".png", { extension: ".png", baseName: "image" }],
    ]);

    const jpgName = generateGroupedName(MOCK_JPG, 0, ".jpg", configs, DEFAULT_GLOBAL, groups);
    expect(jpgName).toBe("photo.jpg");

    const pngName = generateGroupedName(MOCK_PNG, 0, ".png", configs, DEFAULT_GLOBAL, groups);
    expect(pngName).toBe("image.png");
  });

  it("uses independent counters per group", () => {
    const jpg2: FileInfo = { ...MOCK_JPG, path: "/tmp/test/b.jpg", name: "b.jpg", baseName: "b" };
    const png2: FileInfo = { ...MOCK_PNG, path: "/tmp/test/b.png", name: "b.png", baseName: "b" };
    const groups = groupFilesByExtension([MOCK_JPG, jpg2, MOCK_PNG, png2]);

    const configs = new Map<string, ExtensionGroupConfig>([
      [".jpg", { extension: ".jpg", baseName: "foo" }],
      [".png", { extension: ".png", baseName: "bar" }],
    ]);

    expect(generateGroupedName(MOCK_JPG, 0, ".jpg", configs, DEFAULT_GLOBAL, groups)).toBe("foo-1.jpg");
    expect(generateGroupedName(jpg2, 1, ".jpg", configs, DEFAULT_GLOBAL, groups)).toBe("foo-2.jpg");
    expect(generateGroupedName(MOCK_PNG, 0, ".png", configs, DEFAULT_GLOBAL, groups)).toBe("bar-1.png");
    expect(generateGroupedName(png2, 1, ".png", configs, DEFAULT_GLOBAL, groups)).toBe("bar-2.png");
  });

  it("falls back to original baseName when group config has no baseName", () => {
    const groups = groupFilesByExtension([MOCK_JPG]);
    const configs = new Map<string, ExtensionGroupConfig>([[".jpg", { extension: ".jpg", baseName: "" }]]);

    const name = generateGroupedName(MOCK_JPG, 0, ".jpg", configs, DEFAULT_GLOBAL, groups);
    // Single file in group, no counter
    expect(name).toBe("photo.jpg");
  });

  it("skips counter for single-file groups", () => {
    const groups = groupFilesByExtension([MOCK_JPG]);
    const configs = new Map<string, ExtensionGroupConfig>([[".jpg", { extension: ".jpg", baseName: "pic" }]]);

    const name = generateGroupedName(MOCK_JPG, 0, ".jpg", configs, DEFAULT_GLOBAL, groups);
    expect(name).toBe("pic.jpg");
  });

  it("applies prefix and suffix from global config", () => {
    const jpg2: FileInfo = { ...MOCK_JPG, path: "/tmp/test/b.jpg", name: "b.jpg", baseName: "b" };
    const groups = groupFilesByExtension([MOCK_JPG, jpg2]);
    const configs = new Map<string, ExtensionGroupConfig>([[".jpg", { extension: ".jpg", baseName: "pic" }]]);
    const globalWithPrefixSuffix = { ...DEFAULT_GLOBAL, prefix: "pre", suffix: "suf" };

    const name = generateGroupedName(MOCK_JPG, 0, ".jpg", configs, globalWithPrefixSuffix, groups);
    expect(name).toBe("pre_pic-1_suf.jpg");
  });

  it("per-group config overrides global", () => {
    const jpg2: FileInfo = { ...MOCK_JPG, path: "/tmp/test/b.jpg", name: "b.jpg", baseName: "b" };
    const groups = groupFilesByExtension([MOCK_JPG, jpg2]);
    const configs = new Map<string, ExtensionGroupConfig>([
      [".jpg", { extension: ".jpg", baseName: "pic", separator: "-", indexSeparator: "_" }],
    ]);

    const name = generateGroupedName(MOCK_JPG, 0, ".jpg", configs, DEFAULT_GLOBAL, groups);
    expect(name).toBe("pic_1.jpg");
  });

  it("applies case transformation", () => {
    const jpg2: FileInfo = { ...MOCK_JPG, path: "/tmp/test/b.jpg", name: "b.jpg", baseName: "b" };
    const groups = groupFilesByExtension([MOCK_JPG, jpg2]);
    const configs = new Map<string, ExtensionGroupConfig>([[".jpg", { extension: ".jpg", baseName: "MyPhoto" }]]);
    const globalUpper = { ...DEFAULT_GLOBAL, caseStyle: CaseStyle.UPPERCASE };

    const name = generateGroupedName(MOCK_JPG, 0, ".jpg", configs, globalUpper, groups);
    expect(name).toBe("MYPHOTO-1.jpg");
  });

  it("per-group case overrides global case", () => {
    const jpg2: FileInfo = { ...MOCK_JPG, path: "/tmp/test/b.jpg", name: "b.jpg", baseName: "b" };
    const groups = groupFilesByExtension([MOCK_JPG, jpg2]);
    const configs = new Map<string, ExtensionGroupConfig>([
      [".jpg", { extension: ".jpg", baseName: "MyPhoto", caseStyle: CaseStyle.LOWERCASE }],
    ]);
    const globalUpper = { ...DEFAULT_GLOBAL, caseStyle: CaseStyle.UPPERCASE };

    const name = generateGroupedName(MOCK_JPG, 0, ".jpg", configs, globalUpper, groups);
    expect(name).toBe("myphoto-1.jpg");
  });

  it("auto-pads based on group size", () => {
    const files: FileInfo[] = [];
    for (let i = 0; i < 100; i++) {
      files.push({
        path: `/tmp/test/file${i}.jpg`,
        name: `file${i}.jpg`,
        baseName: `file${i}`,
        extension: ".jpg",
        isDirectory: false,
      });
    }
    const groups = groupFilesByExtension(files);
    const configs = new Map<string, ExtensionGroupConfig>([[".jpg", { extension: ".jpg", baseName: "pic" }]]);

    // 100 files → 3-digit padding (100 has 3 digits)
    const name0 = generateGroupedName(files[0]!, 0, ".jpg", configs, DEFAULT_GLOBAL, groups);
    expect(name0).toBe("pic-001.jpg");

    const name99 = generateGroupedName(files[99]!, 99, ".jpg", configs, DEFAULT_GLOBAL, groups);
    expect(name99).toBe("pic-100.jpg");
  });

  it("respects custom startNumber", () => {
    const jpg2: FileInfo = { ...MOCK_JPG, path: "/tmp/test/b.jpg", name: "b.jpg", baseName: "b" };
    const groups = groupFilesByExtension([MOCK_JPG, jpg2]);
    const configs = new Map<string, ExtensionGroupConfig>([
      [".jpg", { extension: ".jpg", baseName: "pic", startNumber: 5 }],
    ]);

    const name = generateGroupedName(MOCK_JPG, 0, ".jpg", configs, DEFAULT_GLOBAL, groups);
    expect(name).toBe("pic-5.jpg");
  });

  it("respects custom paddingDigits", () => {
    const jpg2: FileInfo = { ...MOCK_JPG, path: "/tmp/test/b.jpg", name: "b.jpg", baseName: "b" };
    const groups = groupFilesByExtension([MOCK_JPG, jpg2]);
    const configs = new Map<string, ExtensionGroupConfig>([
      [".jpg", { extension: ".jpg", baseName: "pic", paddingDigits: 4 }],
    ]);

    const name = generateGroupedName(MOCK_JPG, 0, ".jpg", configs, DEFAULT_GLOBAL, groups);
    expect(name).toBe("pic-0001.jpg");
  });
});

describe("getAllOperations", () => {
  it("produces flat operations across all groups", () => {
    const groups = groupFilesByExtension([MOCK_JPG, MOCK_PNG, MOCK_PDF]);
    const configs = new Map<string, ExtensionGroupConfig>([
      [".jpg", { extension: ".jpg", baseName: "photo" }],
      [".png", { extension: ".png", baseName: "image" }],
      [".pdf", { extension: ".pdf", baseName: "doc" }],
    ]);

    const ops = getAllOperations(groups, configs, DEFAULT_GLOBAL);
    expect(ops).toHaveLength(3);
    expect(ops.map((o) => o.newName)).toEqual(expect.arrayContaining(["photo.jpg", "image.png", "doc.pdf"]));
  });

  it("preserves file paths in operations", () => {
    const groups = groupFilesByExtension([MOCK_JPG]);
    const configs = new Map<string, ExtensionGroupConfig>([[".jpg", { extension: ".jpg", baseName: "renamed" }]]);

    const ops = getAllOperations(groups, configs, DEFAULT_GLOBAL);
    expect(ops[0]!.oldPath).toBe("/tmp/test/photo.jpg");
    expect(ops[0]!.newPath).toBe("/tmp/test/renamed.jpg");
  });

  it("handles mixed file types with independent counters", () => {
    const jpg2: FileInfo = { ...MOCK_JPG, path: "/tmp/test/b.jpg", name: "b.jpg", baseName: "b" };
    const png2: FileInfo = { ...MOCK_PNG, path: "/tmp/test/b.png", name: "b.png", baseName: "b" };

    const groups = groupFilesByExtension([MOCK_JPG, jpg2, MOCK_PNG, png2]);
    const configs = new Map<string, ExtensionGroupConfig>([
      [".jpg", { extension: ".jpg", baseName: "foo" }],
      [".png", { extension: ".png", baseName: "bar" }],
    ]);

    const ops = getAllOperations(groups, configs, DEFAULT_GLOBAL);
    const jpgOps = ops.filter((o) => o.newName.endsWith(".jpg"));
    const pngOps = ops.filter((o) => o.newName.endsWith(".png"));

    expect(jpgOps.map((o) => o.newName)).toEqual(["foo-1.jpg", "foo-2.jpg"]);
    expect(pngOps.map((o) => o.newName)).toEqual(["bar-1.png", "bar-2.png"]);
  });
});

describe("validation", () => {
  it("empty baseName is invalid for multi-file groups", () => {
    const jpg2: FileInfo = { ...MOCK_JPG, path: "/tmp/test/b.jpg", name: "b.jpg", baseName: "b" };
    const groups = groupFilesByExtension([MOCK_JPG, jpg2]);
    const configs = new Map<string, ExtensionGroupConfig>([[".jpg", { extension: ".jpg", baseName: "" }]]);

    // Check validation logic
    let valid = true;
    for (const [ext, config] of configs) {
      const groupSize = groups.get(ext)?.length ?? 0;
      if (groupSize > 1 && !config.baseName.trim()) valid = false;
    }
    expect(valid).toBe(false);
  });

  it("empty baseName is valid for single-file groups", () => {
    const groups = groupFilesByExtension([MOCK_JPG]);
    const configs = new Map<string, ExtensionGroupConfig>([[".jpg", { extension: ".jpg", baseName: "" }]]);

    let valid = true;
    for (const [ext, config] of configs) {
      const groupSize = groups.get(ext)?.length ?? 0;
      if (groupSize > 1 && !config.baseName.trim()) valid = false;
    }
    expect(valid).toBe(true);
  });

  it("non-empty baseName is valid for multi-file groups", () => {
    const jpg2: FileInfo = { ...MOCK_JPG, path: "/tmp/test/b.jpg", name: "b.jpg", baseName: "b" };
    const groups = groupFilesByExtension([MOCK_JPG, jpg2]);
    const configs = new Map<string, ExtensionGroupConfig>([[".jpg", { extension: ".jpg", baseName: "pic" }]]);

    let valid = true;
    for (const [ext, config] of configs) {
      const groupSize = groups.get(ext)?.length ?? 0;
      if (groupSize > 1 && !config.baseName.trim()) valid = false;
    }
    expect(valid).toBe(true);
  });
});
