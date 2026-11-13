import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { confirmAlert, open, showToast } from "@raycast/api";
import fs from "fs";
import path from "path";
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

describe("createNote", () => {
  let tempVault: ReturnType<typeof createTempVault>;

  beforeEach(() => {
    tempVault = createTempVault();
    vi.clearAllMocks();
    mockPreferences.openOnCreate = true;
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
    expect(fs.readFileSync(path.join(tempVault.vault.path, "New Note.md"), "utf-8")).toBe("body");
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

  it("reports directory creation failure without opening a note", async () => {
    const saved = await createNote(tempVault.vault, { name: "New Note", path: "note1.md", content: "body", tags: [] });

    expect(saved).toBe(false);
    expect(fs.readFileSync(tempVault.paths.note1Path, "utf-8")).toBe("# Note 1\nSome text.");
    expect(open).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledExactlyOnceWith({
      title: "Couldn't create directories for the given path:",
      message: tempVault.paths.note1Path,
      style: "FAILURE",
    });
  });

  it("reports file write failure after overwrite confirmation without opening a note", async () => {
    const target = path.join(tempVault.vault.path, "Blocked.md");
    fs.mkdirSync(target);

    const saved = await createNote(tempVault.vault, { name: "Blocked", path: "", content: "body", tags: [] });

    expect(saved).toBe(false);
    expect(confirmAlert).toHaveBeenCalledTimes(1);
    expect(fs.statSync(target).isDirectory()).toBe(true);
    expect(open).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledExactlyOnceWith({
      title: "Couldn't write to file:",
      message: target,
      style: "FAILURE",
    });
  });

  it("leaves an existing note unchanged when overwrite is canceled", async () => {
    vi.mocked(confirmAlert).mockResolvedValueOnce(false);

    const saved = await createNote(tempVault.vault, { name: "note1", path: "", content: "replacement", tags: [] });

    expect(saved).toBe(false);
    expect(fs.readFileSync(tempVault.paths.note1Path, "utf-8")).toBe("# Note 1\nSome text.");
    expect(open).not.toHaveBeenCalled();
    expect(showToast).not.toHaveBeenCalled();
  });

  it("saves an existing note after overwrite confirmation", async () => {
    const saved = await createNote(tempVault.vault, { name: "note1", path: "", content: "replacement", tags: [] });

    expect(saved).toBe(true);
    expect(confirmAlert).toHaveBeenCalledTimes(1);
    expect(fs.readFileSync(tempVault.paths.note1Path, "utf-8")).toBe("replacement");
    expect(open).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["...", "Note names can't start with a dot. Obsidian hides those files."],
    ["Folder/Task", "Note names can't contain / or \\. Use the Path field for folders."],
  ])("rejects the note name %s without writing", async (name, message) => {
    const before = fs.readdirSync(tempVault.vault.path, { recursive: true });

    const saved = await createNote(tempVault.vault, { name, path: "", content: "body", tags: [] });

    expect(saved).toBe(false);
    expect(fs.readdirSync(tempVault.vault.path, { recursive: true })).toEqual(before);
    expect(open).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledExactlyOnceWith({ title: "Couldn't create note", message, style: "FAILURE" });
  });

  it("rejects an empty name when the default name is empty", async () => {
    const saved = await createNote(tempVault.vault, { name: "", path: "", content: "body", tags: [] });

    expect(saved).toBe(false);
    expect(showToast).toHaveBeenCalledExactlyOnceWith({
      title: "Couldn't create note",
      message: "Enter a note name.",
      style: "FAILURE",
    });
  });

  it("rejects a path outside the vault without writing", async () => {
    const outside = path.join(path.dirname(tempVault.vault.path), "outside");

    const saved = await createNote(tempVault.vault, { name: "Task", path: "../outside", content: "body", tags: [] });

    expect(saved).toBe(false);
    expect(fs.existsSync(outside)).toBe(false);
    expect(showToast).toHaveBeenCalledExactlyOnceWith({
      title: "Couldn't create note",
      message: "The path must stay inside the vault.",
      style: "FAILURE",
    });
  });

  it("drops a trailing .md from the note name", async () => {
    const saved = await createNote(tempVault.vault, { name: "Task.md", path: "", content: "body", tags: [] });

    expect(saved).toBe(true);
    expect(fs.readFileSync(path.join(tempVault.vault.path, "Task.md"), "utf-8")).toBe("body");
    expect(fs.existsSync(path.join(tempVault.vault.path, "Task.md.md"))).toBe(false);
  });
});
