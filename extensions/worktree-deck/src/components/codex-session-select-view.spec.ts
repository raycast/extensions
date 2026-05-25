import { Color, Icon } from "@raycast/api";
import { describe, expect, it, vi } from "vitest";

import {
  applyCodexSessionArchiveMove,
  applyCodexSessionArchiveRollback,
  buildCodexSessionEntries,
  formatOpenWorktreeInIdeActionTitle,
  resolveCodexSessionOpenPlan,
  SELECT_CODEX_SESSION_ACTION_TITLE,
} from "./codex-session-select-view";
import type { WorktreeTitle } from "../composition-root";

vi.mock("@raycast/api", () => {
  return {
    Action: {},
    ActionPanel: {},
    Icon: {
      Message: "message",
      Terminal: "terminal",
      ArrowLeft: "arrow-left",
    },
    Color: {
      Blue: "blue",
      Green: "green",
      Orange: "orange",
      Yellow: "yellow",
    },
    List: {},
    Toast: {
      Style: {
        Failure: "failure",
      },
    },
    showToast: vi.fn(),
    useNavigation: () => ({ pop: vi.fn() }),
  };
});

/**
 * テスト用のセッション情報を作る
 */
function buildTitle(args: Partial<WorktreeTitle> & { title: string; sessionPath?: string }): WorktreeTitle {
  return {
    title: args.title,
    status: args.status ?? null,
    latestMessage: args.latestMessage ?? null,
    updatedAt: args.updatedAt ?? 1,
    sessionPath: args.sessionPath,
    sessionKind: args.sessionKind ?? "main",
    isWaitingForUser: args.isWaitingForUser,
  };
}

describe("buildCodexSessionEntries", () => {
  it("レビューとサブエージェントを除外してメインセッションだけを返す", () => {
    const entries = buildCodexSessionEntries([
      buildTitle({
        title: "Main",
        sessionPath: "/tmp/019dd94f-27e0-7ad1-8d17-3d628ac5d16b.jsonl",
        updatedAt: 100,
      }),
      buildTitle({
        title: "Review",
        sessionPath: "/tmp/119dd94f-27e0-7ad1-8d17-3d628ac5d16b.jsonl",
        sessionKind: "review",
        updatedAt: 200,
      }),
      buildTitle({
        title: "Subagent",
        sessionPath: "/tmp/219dd94f-27e0-7ad1-8d17-3d628ac5d16b.jsonl",
        sessionKind: "subagent",
        updatedAt: 300,
      }),
      buildTitle({
        title: "Auto review",
        sessionPath: "/tmp/319dd94f-27e0-7ad1-8d17-3d628ac5d16b.jsonl",
        sessionKind: "autoReview",
        updatedAt: 400,
      }),
    ]);

    expect(entries).toEqual([
      {
        id: "019dd94f-27e0-7ad1-8d17-3d628ac5d16b",
        title: "Main",
        subtitle: null,
        threadId: "019dd94f-27e0-7ad1-8d17-3d628ac5d16b",
        sessionPath: "/tmp/019dd94f-27e0-7ad1-8d17-3d628ac5d16b.jsonl",
        updatedAt: 100,
        icon: { source: Icon.Message, tintColor: undefined },
        statusText: null,
        isArchived: false,
      },
    ]);
  });

  it("更新が新しい順に並べる", () => {
    const entries = buildCodexSessionEntries([
      buildTitle({
        title: "Old",
        sessionPath: "/tmp/019dd94f-27e0-7ad1-8d17-3d628ac5d16b.jsonl",
        updatedAt: 100,
      }),
      buildTitle({
        title: "New",
        sessionPath: "/tmp/119dd94f-27e0-7ad1-8d17-3d628ac5d16b.jsonl",
        updatedAt: 300,
      }),
      buildTitle({
        title: "Middle",
        sessionPath: "/tmp/219dd94f-27e0-7ad1-8d17-3d628ac5d16b.jsonl",
        updatedAt: 200,
      }),
    ]);

    expect(entries.map((entry) => entry.title)).toEqual(["New", "Middle", "Old"]);
  });

  it("ステータスと指示待ちを表示情報へ反映する", () => {
    const entries = buildCodexSessionEntries([
      buildTitle({
        title: "Working",
        sessionPath: "/tmp/019dd94f-27e0-7ad1-8d17-3d628ac5d16b.jsonl",
        status: "working",
      }),
      buildTitle({
        title: "Done",
        sessionPath: "/tmp/119dd94f-27e0-7ad1-8d17-3d628ac5d16b.jsonl",
        status: "done",
      }),
      buildTitle({
        title: "Waiting",
        sessionPath: "/tmp/219dd94f-27e0-7ad1-8d17-3d628ac5d16b.jsonl",
        status: "working",
        isWaitingForUser: true,
      }),
    ]);

    expect(new Map(entries.map((entry) => [entry.title, { icon: entry.icon, statusText: entry.statusText }]))).toEqual(
      new Map([
        ["Working", { icon: { source: Icon.Message, tintColor: Color.Green }, statusText: "Working" }],
        ["Done", { icon: { source: Icon.Message, tintColor: Color.Blue }, statusText: "Done" }],
        ["Waiting", { icon: { source: Icon.Message, tintColor: Color.Yellow }, statusText: "Waiting" }],
      ]),
    );
  });

  it("thread id を抽出できないセッションは候補にしない", () => {
    const entries = buildCodexSessionEntries([
      buildTitle({ title: "Main", sessionPath: "/tmp/session-without-id.jsonl" }),
      buildTitle({ title: "No path" }),
    ]);

    expect(entries).toEqual([]);
  });

  it("アーカイブ済み thread id のセッションを除外する", () => {
    const entries = buildCodexSessionEntries(
      [
        buildTitle({
          title: "Visible",
          sessionPath: "/tmp/019dd94f-27e0-7ad1-8d17-3d628ac5d16b.jsonl",
          updatedAt: 100,
        }),
        buildTitle({
          title: "Archived",
          sessionPath: "/tmp/119dd94f-27e0-7ad1-8d17-3d628ac5d16b.jsonl",
          updatedAt: 200,
        }),
      ],
      {
        archivedThreadIds: new Set(["119dd94f-27e0-7ad1-8d17-3d628ac5d16b"]),
      },
    );

    expect(entries.map((entry) => entry.title)).toEqual(["Visible"]);
  });
});

describe("resolveCodexSessionOpenPlan", () => {
  it("メインセッションが複数あるときは選択画面へ遷移する", () => {
    const result = resolveCodexSessionOpenPlan({
      sessions: [
        buildTitle({ title: "Main A", sessionPath: "/tmp/019dd94f-27e0-7ad1-8d17-3d628ac5d16b.jsonl" }),
        buildTitle({ title: "Main B", sessionPath: "/tmp/119dd94f-27e0-7ad1-8d17-3d628ac5d16b.jsonl" }),
      ],
      storedThreadId: "219dd94f-27e0-7ad1-8d17-3d628ac5d16b",
    });

    expect(result.kind).toBe("select");
  });

  it("メインセッションが複数あっても保存済み thread が候補にあれば直接開く", () => {
    const result = resolveCodexSessionOpenPlan({
      sessions: [
        buildTitle({ title: "Main A", sessionPath: "/tmp/019dd94f-27e0-7ad1-8d17-3d628ac5d16b.jsonl" }),
        buildTitle({ title: "Main B", sessionPath: "/tmp/119dd94f-27e0-7ad1-8d17-3d628ac5d16b.jsonl" }),
      ],
      storedThreadId: "119DD94F-27E0-7AD1-8D17-3D628AC5D16B",
    });

    expect(result).toEqual({
      kind: "open-thread",
      threadId: "119dd94f-27e0-7ad1-8d17-3d628ac5d16b",
    });
  });

  it("メインセッションが1件だけならその thread を直接開く", () => {
    const result = resolveCodexSessionOpenPlan({
      sessions: [buildTitle({ title: "Main", sessionPath: "/tmp/019dd94f-27e0-7ad1-8d17-3d628ac5d16b.jsonl" })],
      storedThreadId: null,
    });

    expect(result).toEqual({
      kind: "open-thread",
      threadId: "019dd94f-27e0-7ad1-8d17-3d628ac5d16b",
    });
  });

  it("候補がないときは保存済み thread を使う", () => {
    const result = resolveCodexSessionOpenPlan({
      sessions: [],
      storedThreadId: "019dd94f-27e0-7ad1-8d17-3d628ac5d16b",
    });

    expect(result).toEqual({
      kind: "open-thread",
      threadId: "019dd94f-27e0-7ad1-8d17-3d628ac5d16b",
    });
  });

  it("保存済み thread がアーカイブ済みなら直接開かない", () => {
    const result = resolveCodexSessionOpenPlan({
      sessions: [],
      storedThreadId: "019dd94f-27e0-7ad1-8d17-3d628ac5d16b",
      archivedThreadIds: new Set(["019dd94f-27e0-7ad1-8d17-3d628ac5d16b"]),
    });

    expect(result).toEqual({ kind: "open-path" });
  });

  it("候補も保存済み thread もないときは path 起動する", () => {
    const result = resolveCodexSessionOpenPlan({ sessions: [], storedThreadId: null });

    expect(result).toEqual({ kind: "open-path" });
  });

  it("全メインセッションがアーカイブ済みなら選択画面で復元可能にする", () => {
    const result = resolveCodexSessionOpenPlan({
      sessions: [buildTitle({ title: "Main", sessionPath: "/tmp/019dd94f-27e0-7ad1-8d17-3d628ac5d16b.jsonl" })],
      storedThreadId: null,
      archivedThreadIds: new Set(["019dd94f-27e0-7ad1-8d17-3d628ac5d16b"]),
    });

    expect(result).toEqual({ kind: "select", entries: [] });
  });

  it("選択アクション名は英語で固定する", () => {
    expect(SELECT_CODEX_SESSION_ACTION_TITLE).toBe("Select CA Session");
  });

  it("IDE 起動アクション名は一時起動を示さない", () => {
    expect(formatOpenWorktreeInIdeActionTitle()).toBe("Open in Zed");
    expect(formatOpenWorktreeInIdeActionTitle("Cursor")).toBe("Open in Cursor");
  });
});

describe("Codex セッションアーカイブ表示状態", () => {
  it("archive 成功前に表示中からアーカイブ済みへ移動する", () => {
    const visible = buildCodexSessionEntries([
      buildTitle({ title: "First", sessionPath: "/tmp/019dd94f-27e0-7ad1-8d17-3d628ac5d16b.jsonl", updatedAt: 100 }),
      buildTitle({ title: "Second", sessionPath: "/tmp/119dd94f-27e0-7ad1-8d17-3d628ac5d16b.jsonl", updatedAt: 200 }),
    ]);

    const result = applyCodexSessionArchiveMove({
      visibleEntries: visible,
      archivedEntries: [],
      threadId: "119dd94f-27e0-7ad1-8d17-3d628ac5d16b",
      direction: "archive",
    });

    expect(result.visibleEntries.map((entry) => entry.title)).toEqual(["First"]);
    expect(result.archivedEntries.map((entry) => [entry.title, entry.isArchived])).toEqual([["Second", true]]);
  });

  it("unarchive 成功前にアーカイブ済みから表示中へ移動する", () => {
    const visible = buildCodexSessionEntries([
      buildTitle({ title: "First", sessionPath: "/tmp/019dd94f-27e0-7ad1-8d17-3d628ac5d16b.jsonl", updatedAt: 100 }),
    ]);
    const archived = buildCodexSessionEntries(
      [buildTitle({ title: "Second", sessionPath: "/tmp/119dd94f-27e0-7ad1-8d17-3d628ac5d16b.jsonl", updatedAt: 200 })],
      {
        archivedThreadIds: new Set(["119dd94f-27e0-7ad1-8d17-3d628ac5d16b"]),
        visibility: "archived",
      },
    );

    const result = applyCodexSessionArchiveMove({
      visibleEntries: visible,
      archivedEntries: archived,
      threadId: "119dd94f-27e0-7ad1-8d17-3d628ac5d16b",
      direction: "unarchive",
    });

    expect(result.visibleEntries.map((entry) => [entry.title, entry.isArchived])).toEqual([
      ["Second", false],
      ["First", false],
    ]);
    expect(result.archivedEntries).toEqual([]);
  });

  it("archive 保存失敗時は表示状態を元に戻す", () => {
    const visible = buildCodexSessionEntries([
      buildTitle({ title: "First", sessionPath: "/tmp/019dd94f-27e0-7ad1-8d17-3d628ac5d16b.jsonl", updatedAt: 100 }),
      buildTitle({ title: "Second", sessionPath: "/tmp/119dd94f-27e0-7ad1-8d17-3d628ac5d16b.jsonl", updatedAt: 200 }),
    ]);
    const moved = applyCodexSessionArchiveMove({
      visibleEntries: visible,
      archivedEntries: [],
      threadId: "119dd94f-27e0-7ad1-8d17-3d628ac5d16b",
      direction: "archive",
    });

    const result = applyCodexSessionArchiveRollback({ ...moved, direction: "archive" });

    expect(result.visibleEntries.map((entry) => entry.title)).toEqual(["Second", "First"]);
    expect(result.archivedEntries).toEqual([]);
  });
});
