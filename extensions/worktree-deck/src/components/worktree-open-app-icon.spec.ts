import { describe, expect, it } from "vitest";
import { buildOpenAppAccessory, resolveOpenAppIcon, resolveOpenAppTitle } from "./worktree-open-app-icon";

describe("worktree-open-app-icon", () => {
  it("Zed の公式アイコン asset を返す", () => {
    expect(resolveOpenAppIcon("zed")).toEqual({ source: "zed-icon.png" });
  });

  it("Codex App の公式アイコン asset を返す", () => {
    expect(resolveOpenAppIcon("codex-app")).toEqual({ source: "codex-app-icon.png" });
  });

  it("リスト右側アクセサリは長いブランチ名に影響されない icon のみで表現する", () => {
    expect(buildOpenAppAccessory("codex-app")).toEqual([
      { icon: { source: "codex-app-icon.png" }, tooltip: "Codex App" },
    ]);
  });

  it("フォーム表示向けタイトルは絵文字を含めない", () => {
    expect(resolveOpenAppTitle("zed")).toBe("Zed");
    expect(resolveOpenAppTitle("zed", "vscode")).toBe("VS Code");
    expect(resolveOpenAppTitle("codex-app")).toBe("CA");
  });
});
