import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { open } from "@raycast/api";
import { createNote } from "../api/create-note";
import { createTempVault } from "./helpers/createTemporaryVault";

const mockPreferences = {
  openOnCreate: true,
  fillFormWithDefaults: false,
  prefNoteName: "",
  prefNoteContent: "",
  prefPath: "",
  prefTag: "",
  tags: "",
  blankNote: false,
  folderActions: "",
  focusContentArea: false,
  vaultPath: "",
  configFileName: "",
  removeYAML: false,
  removeLinks: false,
  removeLatex: false,
  excludedFolders: "",
};

vi.mock("@raycast/api", () => ({
  open: vi.fn(() => Promise.resolve()),
  getPreferenceValues: () => mockPreferences,
  confirmAlert: vi.fn(() => Promise.resolve(true)),
  getSelectedText: vi.fn(() => Promise.resolve("")),
  Clipboard: { readText: vi.fn(() => Promise.resolve("")) },
  showToast: vi.fn(() => Promise.resolve()),
  Toast: { Style: { Success: "SUCCESS", Failure: "FAILURE", Animated: "ANIMATED" } },
  Icon: { ExclamationMark: "exclamation-mark" },
}));

describe("createNote openOnCreate", () => {
  let tempVault: ReturnType<typeof createTempVault>;

  beforeEach(() => {
    tempVault = createTempVault();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    tempVault.cleanup();
  });

  it("opens the created note immediately when openOnCreate is enabled", async () => {
    mockPreferences.openOnCreate = true;
    const saved = await createNote(tempVault.vault, { name: "New Note", path: "", content: "body", tags: [] });
    expect(saved).toBe(true);
    expect(open).toHaveBeenCalledTimes(1);
    const url = (open as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("obsidian://open?path=");
    expect(url).toContain(encodeURIComponent("New Note.md"));
  });

  it("does not open the note when openOnCreate is disabled", async () => {
    mockPreferences.openOnCreate = false;
    const saved = await createNote(tempVault.vault, { name: "Another Note", path: "", content: "body", tags: [] });
    expect(saved).toBe(true);
    expect(open).not.toHaveBeenCalled();
  });

  it("still reports success when opening the note fails", async () => {
    mockPreferences.openOnCreate = true;
    vi.mocked(open).mockRejectedValueOnce(new Error("No application available to open URL"));
    const saved = await createNote(tempVault.vault, { name: "Saved Note", path: "", content: "body", tags: [] });
    expect(saved).toBe(true);
    expect(open).toHaveBeenCalledTimes(1);
  });
});
