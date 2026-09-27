import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { setMockPreferences } from "../__mocks__/@raycast/api";

import {
  extensionPreferences,
  openDailyDeskNotePreferences,
  searchAttachmentsPreferences,
  searchNotesPreferences,
} from "@lib/preferences";

describe("preferences", () => {
  it("parses extension preferences into normalized values and signatures", () => {
    setMockPreferences({
      workspaceRoots: "~/Octarine, ./fixtures/workspaces, ~/Octarine",
      excludedWorkspaces: " Work , Personal ",
      excludedFoldersInWorkspaces: " Archive, Templates ",
      showWorkspaceNoteCount: true,
      showPinnedNotesFirst: false,
    });

    const preferences = extensionPreferences();

    expect(preferences.workspaceRoots).toEqual([
      path.normalize(path.join(os.homedir(), "Octarine")),
      path.normalize(path.resolve("./fixtures/workspaces")),
    ]);
    expect(preferences.excludedWorkspaces).toEqual(new Set(["work", "personal"]));
    expect(preferences.excludedFoldersInWorkspaces).toEqual(new Set(["archive", "templates"]));
  });

  it("parses command-specific attachment preferences", () => {
    setMockPreferences({
      workspaceRoots: "~/Octarine",
      excludedWorkspaces: "",
      excludedFoldersInWorkspaces: "",
      showWorkspaceAttachmentCount: true,
      flattenWorkspaceSections: false,
      excludeFileExtensions: ".PNG, pdf , txt",
    });

    const preferences = searchAttachmentsPreferences();

    expect(preferences.showWorkspaceAttachmentCount).toBe(true);
    expect(preferences.flattenWorkspaceSections).toBe(false);
    expect(preferences.excludedExtensions).toEqual(new Set(["png", "pdf", "txt"]));
  });

  it("returns trimmed command preferences and booleans", () => {
    setMockPreferences({
      workspaceRoots: "",
      excludedWorkspaces: "",
      excludedFoldersInWorkspaces: "",
      defaultWorkspace: "  Work Notes  ",
      showFilename: true,
      useLastWorkspace: false,
      showWorkspaceNoteCount: true,
      showPinnedNotesFirst: true,
      searchContent: true,
      previewNotesByDefault: true,
    });

    expect(openDailyDeskNotePreferences()).toEqual({
      defaultWorkspace: "work notes",
      showFilename: true,
      useLastWorkspace: false,
    });

    expect(searchNotesPreferences()).toEqual({
      showWorkspaceNoteCount: true,
      showPinnedNotesFirst: true,
      searchContent: true,
      previewNotesByDefault: true,
    });
  });

  it("keeps the note preview panel off by default", () => {
    setMockPreferences({});

    expect(searchNotesPreferences().previewNotesByDefault).toBe(false);
  });

  it("enables the last workspace by default when the preference is unset", () => {
    setMockPreferences({
      workspaceRoots: "",
      excludedWorkspaces: "",
      excludedFoldersInWorkspaces: "",
    });

    expect(openDailyDeskNotePreferences()).toEqual({
      defaultWorkspace: "",
      showFilename: false,
      useLastWorkspace: true,
    });
  });
});
