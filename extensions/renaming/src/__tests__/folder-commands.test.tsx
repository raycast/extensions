/**
 * Tests for the folder command wrappers: each renders its file counterpart
 * with the folder-only flag set, which is the whole of their behaviour.
 */

import { describe, it, expect } from "vitest";
import RenameFiles from "../index";
import ReplaceCharacters from "../replace";
import RenameFolders from "../rename-folders";
import ReplaceInFolderNames from "../replace-folders";

type RenderedElement = { type: unknown; props: { foldersOnly?: boolean } };

describe("Rename Folder(s)", () => {
  it("renders the rename command in folder mode", () => {
    const element = RenameFolders() as unknown as RenderedElement;
    expect(element.type).toBe(RenameFiles);
    expect(element.props.foldersOnly).toBe(true);
  });
});

describe("Replace in Folder Names", () => {
  it("renders the replace command in folder mode", () => {
    const element = ReplaceInFolderNames() as unknown as RenderedElement;
    expect(element.type).toBe(ReplaceCharacters);
    expect(element.props.foldersOnly).toBe(true);
  });
});
