import { describe, expect, it } from "vitest";

import { worktreeIdeAppService } from "./worktree-ide-app.service";

describe("worktreeIdeAppService", () => {
  it("保存値が無い場合は Zed にフォールバックする", () => {
    expect(worktreeIdeAppService.resolvePreferred(null)).toBe("zed");
  });

  it("対応 IDE だけを正規化する", () => {
    expect(worktreeIdeAppService.normalizeIdeApp("zed")).toBe("zed");
    expect(worktreeIdeAppService.normalizeIdeApp("vscode")).toBe("vscode");
    expect(worktreeIdeAppService.normalizeIdeApp("cursor")).toBe("cursor");
    expect(worktreeIdeAppService.normalizeIdeApp("unknown")).toBeNull();
  });

  it("設定画面用の IDE 選択肢を返す", () => {
    expect(worktreeIdeAppService.listIdeAppOptions()).toEqual([
      { value: "zed", title: "Zed" },
      { value: "vscode", title: "VS Code" },
      { value: "cursor", title: "Cursor" },
    ]);
  });
});
