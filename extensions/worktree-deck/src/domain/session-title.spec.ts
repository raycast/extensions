import { describe, expect, it } from "vitest";

import { sessionTitleService } from "./session-title.service";

describe("sessionTitleService", () => {
  it("タイトルを1行の表示文字列へ正規化する", () => {
    expect(sessionTitleService.normalizeTitle("\n セッションタイトル生成 \nsecond")).toBe("セッションタイトル生成");
  });

  it("制御文字を除去して最大長に丸める", () => {
    const title = sessionTitleService.normalizeTitle(`abc\u0000${"x".repeat(100)}`);

    expect(title).toHaveLength(80);
    expect(title?.startsWith("abc")).toBe(true);
  });

  it("保存エントリを既存 createdAt を保って組み立てる", () => {
    const result = sessionTitleService.buildEntry({
      threadId: "thread-1",
      worktreePath: "/repo/worktree",
      title: "Generated title",
      now: "2026-05-20T00:00:00.000Z",
      existing: {
        threadId: "thread-1",
        worktreePath: "/repo/worktree",
        title: "Old title",
        source: "auto-start",
        createdAt: "2026-05-19T00:00:00.000Z",
        updatedAt: "2026-05-19T00:00:00.000Z",
      },
    });

    expect(result).toEqual({
      threadId: "thread-1",
      worktreePath: "/repo/worktree",
      title: "Generated title",
      source: "auto-start",
      createdAt: "2026-05-19T00:00:00.000Z",
      updatedAt: "2026-05-20T00:00:00.000Z",
    });
  });

  it("壊れた保存値を除外する", () => {
    expect(
      sessionTitleService.normalizeStorage({
        "thread-1": {
          worktreePath: "/repo/worktree",
          title: "Valid",
          createdAt: "2026-05-20T00:00:00.000Z",
          updatedAt: "2026-05-20T00:00:00.000Z",
        },
        "thread-2": {
          worktreePath: "",
          title: "Invalid",
        },
      }),
    ).toEqual({
      "thread-1": {
        threadId: "thread-1",
        worktreePath: "/repo/worktree",
        title: "Valid",
        source: "auto-start",
        createdAt: "2026-05-20T00:00:00.000Z",
        updatedAt: "2026-05-20T00:00:00.000Z",
      },
    });
  });
});
