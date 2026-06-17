import { describe, it, expect, vi, beforeEach } from "vitest";
import YAML from "yaml";

// Mock Raycast API — unavailable outside the Raycast runtime
vi.mock("@raycast/api", () => ({
  Clipboard: { readText: vi.fn() },
  getPreferenceValues: vi.fn(() => ({})),
}));

// Mock change-case — not under test here
vi.mock("change-case", () => ({ capitalCase: (s: string) => s }));

// We intercept fs-extra so tests never touch the real filesystem.
// Each test seeds `mockFiles` with the YAML it wants to expose.
const mockFiles: Record<string, string> = {};
let lastWritten: { path: string; content: string } | null = null;

vi.mock("fs-extra", () => ({
  default: {
    readFileSync: (p: string) => {
      if (!(p in mockFiles)) throw new Error(`File not found: ${p}`);
      return mockFiles[p];
    },
    writeFileSync: (p: string, content: string) => {
      lastWritten = { path: p, content };
    },
    // stubs used by other parts of utils.ts (not under test)
    readdirSync: vi.fn(() => []),
    existsSync: vi.fn(() => false),
    statSync: vi.fn(() => ({ mtime: new Date(), isFile: () => false })),
    appendFileSync: vi.fn(),
  },
}));

// Import after mocks are in place
import { updateMatchInFile } from "./utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const seedFile = (filePath: string, yaml: string) => {
  mockFiles[filePath] = yaml;
  lastWritten = null;
};

const writtenDoc = () => {
  if (!lastWritten) throw new Error("writeFileSync was never called");
  return YAML.parse(lastWritten.content);
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("updateMatchInFile", () => {
  beforeEach(() => {
    lastWritten = null;
    for (const k of Object.keys(mockFiles)) delete mockFiles[k];
  });

  // -------------------------------------------------------------------------
  // Happy path — single trigger
  // -------------------------------------------------------------------------

  it("updates trigger, replace, and label when the match uses a single trigger key", () => {
    const filePath = "/fake/match.yml";
    seedFile(
      filePath,
      `matches:
  - trigger: ":hello"
    replace: "Hello world"
`,
    );

    updateMatchInFile(filePath, [":hello"], {
      triggers: [":hi"],
      label: "Greeting",
      replace: "Hi there",
    });

    const doc = writtenDoc();
    expect(doc.matches).toHaveLength(1);
    expect(doc.matches[0].trigger).toBe(":hi");
    expect(doc.matches[0].triggers).toBeUndefined();
    expect(doc.matches[0].replace).toBe("Hi there");
    expect(doc.matches[0].label).toBe("Greeting");
  });

  // -------------------------------------------------------------------------
  // Happy path — multi trigger
  // -------------------------------------------------------------------------

  it("updates a match that uses a triggers array (multi-trigger format)", () => {
    const filePath = "/fake/match.yml";
    seedFile(
      filePath,
      `matches:
  - triggers: [":a", ":b"]
    replace: "alpha"
`,
    );

    updateMatchInFile(filePath, [":a", ":b"], {
      triggers: [":x", ":y", ":z"],
      replace: "xyz",
    });

    const doc = writtenDoc();
    expect(doc.matches[0].triggers).toEqual([":x", ":y", ":z"]);
    expect(doc.matches[0].trigger).toBeUndefined();
    expect(doc.matches[0].replace).toBe("xyz");
  });

  // -------------------------------------------------------------------------
  // Single → multi promotion
  // -------------------------------------------------------------------------

  it("promotes a single-trigger entry to triggers array when given multiple new triggers", () => {
    const filePath = "/fake/match.yml";
    seedFile(
      filePath,
      `matches:
  - trigger: ":one"
    replace: "one"
`,
    );

    updateMatchInFile(filePath, [":one"], {
      triggers: [":one", ":1"],
      replace: "one",
    });

    const doc = writtenDoc();
    expect(doc.matches[0].triggers).toEqual([":one", ":1"]);
    expect(doc.matches[0].trigger).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Multi → single demotion
  // -------------------------------------------------------------------------

  it("demotes a multi-trigger entry to a single trigger key when given one new trigger", () => {
    const filePath = "/fake/match.yml";
    seedFile(
      filePath,
      `matches:
  - triggers: [":foo", ":bar"]
    replace: "foobar"
`,
    );

    updateMatchInFile(filePath, [":foo", ":bar"], {
      triggers: [":foo"],
      replace: "foobar",
    });

    const doc = writtenDoc();
    expect(doc.matches[0].trigger).toBe(":foo");
    expect(doc.matches[0].triggers).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Label deletion — empty string
  // -------------------------------------------------------------------------

  it("removes the label field when the update passes an empty label", () => {
    const filePath = "/fake/match.yml";
    seedFile(
      filePath,
      `matches:
  - trigger: ":greet"
    label: "Old label"
    replace: "Hello"
`,
    );

    updateMatchInFile(filePath, [":greet"], {
      triggers: [":greet"],
      label: "",
      replace: "Hello",
    });

    const doc = writtenDoc();
    expect(doc.matches[0].label).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Label deletion — whitespace-only string
  // -------------------------------------------------------------------------

  it("removes the label field when the update passes a whitespace-only label", () => {
    const filePath = "/fake/match.yml";
    seedFile(
      filePath,
      `matches:
  - trigger: ":greet"
    label: "Old label"
    replace: "Hello"
`,
    );

    updateMatchInFile(filePath, [":greet"], {
      triggers: [":greet"],
      label: "   ",
      replace: "Hello",
    });

    const doc = writtenDoc();
    expect(doc.matches[0].label).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Unknown-field preservation (vars, image_path, etc.)
  // -------------------------------------------------------------------------

  it("preserves unrelated fields like vars when updating a match", () => {
    const filePath = "/fake/match.yml";
    seedFile(
      filePath,
      `matches:
  - trigger: ":date"
    replace: "{{mydate}}"
    vars:
      - name: mydate
        type: date
        params:
          format: "%Y-%m-%d"
`,
    );

    updateMatchInFile(filePath, [":date"], {
      triggers: [":today"],
      replace: "{{mydate}}",
    });

    const doc = writtenDoc();
    expect(doc.matches[0].trigger).toBe(":today");
    expect(doc.matches[0].vars).toBeDefined();
    expect(doc.matches[0].vars[0].name).toBe("mydate");
  });

  // -------------------------------------------------------------------------
  // Multiple matches in file — only the target is mutated
  // -------------------------------------------------------------------------

  it("leaves other matches untouched when only one match is updated", () => {
    const filePath = "/fake/match.yml";
    seedFile(
      filePath,
      `matches:
  - trigger: ":aaa"
    replace: "AAA"
  - trigger: ":bbb"
    replace: "BBB"
  - trigger: ":ccc"
    replace: "CCC"
`,
    );

    updateMatchInFile(filePath, [":bbb"], {
      triggers: [":bbb"],
      replace: "Updated BBB",
    });

    const doc = writtenDoc();
    expect(doc.matches).toHaveLength(3);
    expect(doc.matches[0].replace).toBe("AAA");
    expect(doc.matches[1].replace).toBe("Updated BBB");
    expect(doc.matches[2].replace).toBe("CCC");
  });

  // -------------------------------------------------------------------------
  // Error path — match not found
  // -------------------------------------------------------------------------

  it("throws when the original triggers do not match any entry in the file", () => {
    const filePath = "/fake/match.yml";
    seedFile(
      filePath,
      `matches:
  - trigger: ":real"
    replace: "real"
`,
    );

    expect(() =>
      updateMatchInFile(filePath, [":ghost"], {
        triggers: [":ghost"],
        replace: "boo",
      }),
    ).toThrow(/not found/i);
  });

  // -------------------------------------------------------------------------
  // Error path — multi-trigger array order matters (exact match required)
  // -------------------------------------------------------------------------

  it("throws when the trigger array order differs from the stored order", () => {
    const filePath = "/fake/match.yml";
    seedFile(
      filePath,
      `matches:
  - triggers: [":a", ":b"]
    replace: "ab"
`,
    );

    expect(() =>
      updateMatchInFile(filePath, [":b", ":a"], {
        triggers: [":b", ":a"],
        replace: "ba",
      }),
    ).toThrow(/not found/i);
  });

  // -------------------------------------------------------------------------
  // Error path — no matches sequence in file
  // -------------------------------------------------------------------------

  it("throws when the YAML file has no top-level matches key", () => {
    const filePath = "/fake/match.yml";
    seedFile(filePath, `something: else\n`);

    expect(() =>
      updateMatchInFile(filePath, [":foo"], {
        triggers: [":foo"],
        replace: "bar",
      }),
    ).toThrow(/No 'matches' sequence/i);
  });
});
