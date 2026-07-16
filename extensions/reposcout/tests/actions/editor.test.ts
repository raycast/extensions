import { describe, expect, it } from "vitest";
import type { Application } from "@raycast/api";
import { EDITOR_TARGETS, findApplication } from "../../src/actions/editor";

/** Build a minimal Application fixture. */
function app(name: string, bundleId?: string): Application {
  return { name, path: `/Applications/${name}.app`, ...(bundleId ? { bundleId } : {}) };
}

describe("findApplication", () => {
  it("matches VS Code by its stable bundle id", () => {
    const apps = [
      app("Xcode", "com.apple.dt.Xcode"),
      app("Visual Studio Code", "com.microsoft.VSCode"),
    ];
    expect(findApplication(EDITOR_TARGETS.vscode, apps)?.bundleId).toBe("com.microsoft.VSCode");
  });

  it("prefers bundle id order (stable over Insiders)", () => {
    const apps = [
      app("Visual Studio Code - Insiders", "com.microsoft.VSCodeInsiders"),
      app("Visual Studio Code", "com.microsoft.VSCode"),
    ];
    expect(findApplication(EDITOR_TARGETS.vscode, apps)?.bundleId).toBe("com.microsoft.VSCode");
  });

  it("falls back to an exact display name when no bundle id is present", () => {
    const apps = [app("Visual Studio Code")];
    expect(findApplication(EDITOR_TARGETS.vscode, apps)?.name).toBe("Visual Studio Code");
  });

  it("resolves VSCodium as a VS Code variant", () => {
    const apps = [app("VSCodium", "com.vscodium.codium")];
    expect(findApplication(EDITOR_TARGETS.vscode, apps)?.bundleId).toBe("com.vscodium.codium");
  });

  it("does not mistake Xcode for VS Code", () => {
    const apps = [app("Xcode", "com.apple.dt.Xcode")];
    expect(findApplication(EDITOR_TARGETS.vscode, apps)).toBeNull();
  });

  it("matches Cursor by bundle id and by name", () => {
    expect(
      findApplication(EDITOR_TARGETS.cursor, [app("Cursor", "com.todesktop.230313mzl4w4u92")])
        ?.name,
    ).toBe("Cursor");
    expect(findApplication(EDITOR_TARGETS.cursor, [app("Cursor")])?.name).toBe("Cursor");
  });

  it("returns null when the editor is not installed", () => {
    const apps = [app("Safari", "com.apple.Safari")];
    expect(findApplication(EDITOR_TARGETS.vscode, apps)).toBeNull();
    expect(findApplication(EDITOR_TARGETS.cursor, apps)).toBeNull();
  });
});
