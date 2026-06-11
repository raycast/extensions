import { afterEach, describe, expect, it, vi } from "vitest";
import { EditorId, Editors, getEditorUrlScheme, isEditorInstalled, type RaycastApplication } from "./editor";

function app(overrides: Partial<RaycastApplication>): RaycastApplication {
  return overrides as RaycastApplication;
}

function editor(id: EditorId) {
  const found = Editors.find((item) => item.id === id);
  if (!found) throw new Error(`Missing editor fixture for ${id}`);
  return found;
}

describe("editor domain", () => {
  const platform = vi.spyOn(process, "platform", "get");

  afterEach(() => {
    platform.mockReturnValue("darwin");
  });

  it("builds clone URL schemes for supported editors", () => {
    const repoUrl = "https://gitea.example.com/alice/my_repo.git";
    const encoded = encodeURIComponent(repoUrl);

    expect(getEditorUrlScheme(EditorId.VSCode, repoUrl)).toBe(`vscode://vscode.git/clone?url=${encoded}`);
    expect(getEditorUrlScheme(EditorId.Cursor, repoUrl)).toBe(`cursor://vscode.git/clone?url=${encoded}`);
    expect(getEditorUrlScheme(EditorId.Zed, repoUrl)).toBe(`zed://git/clone?repo=${encoded}`);
    expect(getEditorUrlScheme(EditorId.IntelliJ, repoUrl)).toBe(
      `jetbrains://idea/checkout/git?checkout.repo=${encoded}&idea.required.plugins.id=Git4Idea`,
    );
  });

  it("matches macOS editors by bundle id or name", () => {
    platform.mockReturnValue("darwin");

    expect(isEditorInstalled(editor(EditorId.VSCode), [app({ bundleId: "com.microsoft.VSCode" })])).toBe(true);
    expect(isEditorInstalled(editor(EditorId.Cursor), [app({ name: "Cursor" })])).toBe(true);
    expect(isEditorInstalled(editor(EditorId.Zed), [app({ localizedName: "Zed" })])).toBe(true);
    expect(isEditorInstalled(editor(EditorId.Zed), [app({ localizedName: "Zed Preview" })])).toBe(true);
  });

  it("matches Windows editors by app name or normalized path", () => {
    platform.mockReturnValue("win32");

    expect(
      isEditorInstalled(editor(EditorId.IntelliJ), [
        app({ path: "C:\\Program Files\\JetBrains\\IntelliJ IDEA 2024\\bin\\idea64.exe" }),
      ]),
    ).toBe(true);
    expect(isEditorInstalled(editor(EditorId.Cursor), [app({ localizedName: "Cursor" })])).toBe(true);
    expect(isEditorInstalled(editor(EditorId.Zed), [app({ path: "C:\\Program Files\\zen.exe" })])).toBe(false);
  });
});
