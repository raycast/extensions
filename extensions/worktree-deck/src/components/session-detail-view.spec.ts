import { Color } from "@raycast/api";
import { describe, expect, it, vi } from "vitest";

import {
  PRIMARY_SESSION_ACTION_TITLE,
  PRIMARY_SESSION_ACTION_SHORTCUT,
  SECONDARY_SESSION_ACTION_TITLE,
  buildSessionDetailMarkdown,
  buildSessionEntries,
  resolveSessionOpenTargets,
  resolveSessionStatusTint,
} from "./session-detail-view";
import type { WorktreeTitle } from "../application/worktree-title.entity";

vi.mock("@raycast/api", () => {
  return {
    Action: {},
    ActionPanel: {},
    Detail: {},
    Icon: {
      Message: "message",
    },
    List: {},
    Color: {
      Green: "green",
      Blue: "blue",
      Red: "red",
    },
    useNavigation: () => ({ pop: vi.fn() }),
  };
});

/**
 * テスト用のセッション情報を作る
 */
function buildSession(args: {
  title: string;
  updatedAt: number;
  status: WorktreeTitle["status"];
  sessionPath?: string;
}): WorktreeTitle {
  return {
    title: args.title,
    latestMessage: null,
    updatedAt: args.updatedAt,
    status: args.status,
    sessionPath: args.sessionPath,
    sessionKind: "main",
  };
}

describe("resolveSessionStatusTint", () => {
  it("working は緑", () => {
    expect(resolveSessionStatusTint("working")).toBe(Color.Green);
  });

  it("done は青", () => {
    expect(resolveSessionStatusTint("done")).toBe(Color.Blue);
  });

  it("status が null のときは未指定", () => {
    expect(resolveSessionStatusTint(null)).toBeUndefined();
  });
});

describe("buildSessionEntries", () => {
  it("セッション一覧のアイコン色にステータスを反映する", () => {
    const sessions: WorktreeTitle[] = [
      buildSession({ title: "working session", updatedAt: 1, status: "working", sessionPath: "/tmp/a.jsonl" }),
      buildSession({ title: "done session", updatedAt: 2, status: "done", sessionPath: "/tmp/b.jsonl" }),
      buildSession({ title: "unknown session", updatedAt: 3, status: null, sessionPath: "/tmp/c.jsonl" }),
    ];

    const entries = buildSessionEntries(sessions);

    expect(entries[0]?.icon).toEqual({ source: "message", tintColor: Color.Green });
    expect(entries[1]?.icon).toEqual({ source: "message", tintColor: Color.Blue });
    expect(entries[2]?.icon).toEqual({ source: "message", tintColor: undefined });
  });

  it("セッション一覧の表示データにスキル使用履歴を含める", () => {
    const sessions: WorktreeTitle[] = [
      {
        ...buildSession({ title: "session", updatedAt: 1, status: "done", sessionPath: "/tmp/a.jsonl" }),
        skillUsages: [{ name: "imagegen", timestamp: "2026-05-03T10:00:00.000Z" }],
      },
    ];

    expect(buildSessionEntries(sessions)[0]?.skillUsages).toEqual([
      { name: "imagegen", timestamp: "2026-05-03T10:00:00.000Z" },
    ]);
  });
});

describe("buildSessionDetailMarkdown", () => {
  it("タイトルの上にスキル使用履歴を表示する", () => {
    const [entry] = buildSessionEntries([
      {
        ...buildSession({ title: "Implement feature", updatedAt: 1, status: "done", sessionPath: "/tmp/a.jsonl" }),
        skillUsages: [
          { name: "imagegen", timestamp: "2026-05-03T10:00:00.000Z" },
          { name: "Computer Use", timestamp: null },
        ],
      },
    ]);

    expect(buildSessionDetailMarkdown({ entry: entry!, messages: [], isLoading: false })).toBe(
      "## Skill Usage\n\n" +
        "- `imagegen` (2026-05-03T10:00:00.000Z)\n" +
        "- `Computer Use`\n\n" +
        "# Implement feature\n\n" +
        "No session messages found.",
    );
  });
});

describe("resolveSessionOpenTargets", () => {
  it("セッションファイルと親ディレクトリを返す", () => {
    const result = resolveSessionOpenTargets("/Users/example/.codex/session/2026/02/07/session.jsonl");

    expect(result).toEqual({
      sessionFilePath: "/Users/example/.codex/session/2026/02/07/session.jsonl",
      sessionDirectoryPath: "/Users/example/.codex/session/2026/02/07",
    });
  });

  it("空白のみのパスでは null を返す", () => {
    expect(resolveSessionOpenTargets("   ")).toBeNull();
  });
});

describe("session detail action titles", () => {
  it("主アクションは英語のセッション内容表示", () => {
    expect(PRIMARY_SESSION_ACTION_TITLE).toBe("Show Session Content");
  });

  it("副アクションは英語のセッションファイル表示", () => {
    expect(SECONDARY_SESSION_ACTION_TITLE).toBe("Open Session File");
  });

  it("主アクションは予約済みではないショートカットを持つ", () => {
    expect(PRIMARY_SESSION_ACTION_SHORTCUT).toEqual({ modifiers: ["cmd"], key: "l" });
    expect(PRIMARY_SESSION_ACTION_SHORTCUT).not.toEqual({ modifiers: ["cmd"], key: "enter" });
  });
});
