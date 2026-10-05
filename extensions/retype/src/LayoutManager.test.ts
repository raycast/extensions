import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock the Swift interop module
// vi.hoisted() ensures the variables are available when vi.mock() is hoisted.
// ---------------------------------------------------------------------------

const { mockGetEnabledLayouts, mockGetCurrentLayout, mockSelectLayout } =
  vi.hoisted(() => ({
    mockGetEnabledLayouts: vi.fn(),
    mockGetCurrentLayout: vi.fn(),
    mockSelectLayout: vi.fn(),
  }));

vi.mock("swift:../swift", () => ({
  getEnabledLayouts: mockGetEnabledLayouts,
  getCurrentLayout: mockGetCurrentLayout,
  selectLayout: mockSelectLayout,
}));

import { LayoutManager } from "./LayoutManager";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Simulate the system having `layouts` with `active` being the current one. */
function setupLayouts(
  layouts: Array<{ id: string; title: string }>,
  activeTitle: string,
) {
  mockGetEnabledLayouts.mockResolvedValue(layouts);
  mockGetCurrentLayout.mockResolvedValue(activeTitle);
}

// ---------------------------------------------------------------------------
// LayoutManager.getAll
// ---------------------------------------------------------------------------

describe("LayoutManager.getAll", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    LayoutManager.activeInput = undefined;
  });

  it("returns all enabled layouts", async () => {
    setupLayouts(
      [
        { id: "en", title: "English" },
        { id: "ru", title: "Russian" },
      ],
      "English",
    );

    const layouts = await LayoutManager.getAll();
    expect(layouts).toHaveLength(2);
    expect(layouts.map((l) => l.id)).toContain("en");
    expect(layouts.map((l) => l.id)).toContain("ru");
  });

  it("sorts layouts alphabetically by title", async () => {
    setupLayouts(
      [
        { id: "ru", title: "Russian" },
        { id: "en", title: "English" },
      ],
      "English",
    );

    const layouts = await LayoutManager.getAll();
    expect(layouts.map((l) => l.title)).toEqual(["English", "Russian"]);
  });

  it("marks the current layout as active", async () => {
    setupLayouts(
      [
        { id: "en", title: "English" },
        { id: "ru", title: "Russian" },
      ],
      "Russian",
    );

    const layouts = await LayoutManager.getAll();
    const ru = layouts.find((l) => l.id === "ru")!;
    const en = layouts.find((l) => l.id === "en")!;
    expect(ru.active).toBe(true);
    expect(en.active).toBe(false);
  });

  it("sets LayoutManager.activeInput to the current layout title", async () => {
    setupLayouts([{ id: "en", title: "English" }], "English");
    await LayoutManager.getAll();
    expect(LayoutManager.activeInput).toBe("English");
  });

  it("returns an empty array when no layouts are enabled", async () => {
    setupLayouts([], "");
    const layouts = await LayoutManager.getAll();
    expect(layouts).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// LayoutManager.getNextInput
// ---------------------------------------------------------------------------

describe("LayoutManager.getNextInput", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    LayoutManager.activeInput = undefined;
  });

  it("returns the layout after the active one", async () => {
    setupLayouts(
      [
        { id: "en", title: "English" },
        { id: "ru", title: "Russian" },
      ],
      "English",
    );

    const next = await LayoutManager.getNextInput();
    expect(next.id).toBe("ru");
  });

  it("wraps around to first layout when active is last", async () => {
    setupLayouts(
      [
        { id: "en", title: "English" },
        { id: "ru", title: "Russian" },
      ],
      "Russian",
    );

    // When active is last, getNextInput keeps `next = allLayouts[0]`
    const next = await LayoutManager.getNextInput();
    expect(next.id).toBe("en");
  });

  it("returns first layout when no layout is active", async () => {
    setupLayouts(
      [
        { id: "en", title: "English" },
        { id: "ru", title: "Russian" },
      ],
      "", // nothing matches
    );

    const next = await LayoutManager.getNextInput();
    expect(next.id).toBe("en");
  });
});

// ---------------------------------------------------------------------------
// LayoutManager.getPrevInput
// ---------------------------------------------------------------------------

describe("LayoutManager.getPrevInput", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    LayoutManager.activeInput = undefined;
  });

  it("returns the layout before the active one", async () => {
    setupLayouts(
      [
        { id: "en", title: "English" },
        { id: "ru", title: "Russian" },
      ],
      "Russian",
    );

    const prev = await LayoutManager.getPrevInput();
    expect(prev.id).toBe("en");
  });

  it("stays at first layout when active is first", async () => {
    setupLayouts(
      [
        { id: "en", title: "English" },
        { id: "ru", title: "Russian" },
      ],
      "English",
    );

    const prev = await LayoutManager.getPrevInput();
    expect(prev.id).toBe("en");
  });

  it("returns first layout when no layout is active", async () => {
    setupLayouts(
      [
        { id: "en", title: "English" },
        { id: "ru", title: "Russian" },
      ],
      "",
    );

    const prev = await LayoutManager.getPrevInput();
    expect(prev.id).toBe("en");
  });
});

// ---------------------------------------------------------------------------
// LayoutManager.setInput
// ---------------------------------------------------------------------------

describe("LayoutManager.setInput", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    LayoutManager.activeInput = undefined;
    mockSelectLayout.mockResolvedValue("found");
  });

  it("calls selectLayout directly and returns the title on success", async () => {
    mockSelectLayout.mockResolvedValue("found");

    const result = await LayoutManager.setInput("Russian");
    expect(result).toBe("Russian");
    expect(mockSelectLayout).toHaveBeenCalledWith("Russian");
    expect(mockGetEnabledLayouts).not.toHaveBeenCalled();
    expect(mockGetCurrentLayout).not.toHaveBeenCalled();
  });

  it("returns null when selectLayout does not find the layout", async () => {
    mockSelectLayout.mockResolvedValue("not_found");

    const result = await LayoutManager.setInput("NonExistent");
    expect(result).toBeNull();
    expect(mockSelectLayout).toHaveBeenCalledWith("NonExistent");
  });
});

// ---------------------------------------------------------------------------
// LayoutManager.setNextInput
// ---------------------------------------------------------------------------

describe("LayoutManager.setNextInput", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    LayoutManager.activeInput = undefined;
    mockSelectLayout.mockResolvedValue("found");
  });

  it("activates the next layout and returns it", async () => {
    setupLayouts(
      [
        { id: "en", title: "English" },
        { id: "ru", title: "Russian" },
      ],
      "English",
    );

    const result = await LayoutManager.setNextInput();
    expect(result.id).toBe("ru");
    expect(mockSelectLayout).toHaveBeenCalledWith("Russian");
  });
});

// ---------------------------------------------------------------------------
// Layout instance: activate
// ---------------------------------------------------------------------------

describe("Layout.activate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    LayoutManager.activeInput = undefined;
  });

  it("resolves when selectLayout returns 'found'", async () => {
    setupLayouts([{ id: "en", title: "English" }], "English");
    mockSelectLayout.mockResolvedValue("found");

    const layouts = await LayoutManager.getAll();
    await expect(layouts[0].activate()).resolves.toBeUndefined();
  });

  it("throws when selectLayout does not return 'found'", async () => {
    setupLayouts([{ id: "en", title: "English" }], "English");
    mockSelectLayout.mockResolvedValue("not_found");

    const layouts = await LayoutManager.getAll();
    await expect(layouts[0].activate()).rejects.toThrow(
      'Layout "English" Not Found',
    );
  });
});
