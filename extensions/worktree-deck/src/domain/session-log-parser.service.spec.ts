import { describe, expect, it } from "vitest";

import { sessionLogParserService } from "./session-log-parser.service";

/**
 * テスト用に JSONL 行へ変換する
 */
function line(value: unknown): string {
  return JSON.stringify(value);
}

/**
 * テスト用に JSONL 相当の複数行を解析する
 */
function parseLines(values: unknown[]) {
  const state = sessionLogParserService.createParseState();
  for (const value of values) {
    sessionLogParserService.updateParseState({
      line: line(value),
      homeDir: null,
      state,
      skipFirstUserMessage: false,
    });
  }
  return sessionLogParserService.finalizeParseState(state);
}

describe("sessionLogParserService", () => {
  it("user message の cwd と final_answer から完了セッションを解析する", () => {
    const state = sessionLogParserService.createParseState();
    const path = "/tmp/repo-a/worktree-a";

    sessionLogParserService.updateParseState({
      line: line({
        timestamp: "2026-05-03T10:00:00.000Z",
        type: "event_msg",
        payload: {
          type: "user_message",
          message: `Implement feature\n<environment_context>\n<cwd>${path}</cwd>\n</environment_context>`,
          turn_id: "turn-1",
        },
      }),
      homeDir: null,
      state,
      skipFirstUserMessage: false,
    });
    sessionLogParserService.updateParseState({
      line: line({
        type: "response_item",
        payload: {
          type: "message",
          role: "assistant",
          content: [{ type: "output_text", text: "Done" }],
          phase: "final_answer",
        },
      }),
      homeDir: null,
      state,
      skipFirstUserMessage: false,
    });

    expect(sessionLogParserService.finalizeParseState(state)).toMatchObject({
      title: "Implement feature",
      titleTurnId: "turn-1",
      cwds: [path],
      status: "done",
      latestMessage: "🤖 Done",
      startedAt: Date.parse("2026-05-03T10:00:00.000Z"),
      sessionKind: "main",
      isWaitingForUser: false,
    });
  });

  it("latestMessage は回答本文の改行を保持する", () => {
    const result = parseLines([
      {
        timestamp: "2026-05-03T10:00:00.000Z",
        type: "event_msg",
        payload: {
          type: "user_message",
          message: "Review changes",
        },
      },
      {
        timestamp: "2026-05-03T10:01:00.000Z",
        type: "event_msg",
        payload: {
          type: "agent_message",
          message: "Final decision: approve\n\n- Commit: abc123\n- Tests: passed",
        },
      },
    ]);

    expect(result.latestMessage).toBe("🤖 Final decision: approve\n\n- Commit: abc123\n- Tests: passed");
  });

  it("goal 継続 developer message の objective を title fallback として解析する", () => {
    const path = "/tmp/repo-a/worktree-a";
    const parsed = parseLines([
      {
        timestamp: "2026-05-03T10:00:00.000Z",
        type: "session_meta",
        payload: {
          cwd: path,
          source: "cli",
        },
      },
      {
        timestamp: "2026-05-03T10:00:01.000Z",
        type: "response_item",
        payload: {
          type: "message",
          role: "developer",
          content: [
            {
              type: "input_text",
              text:
                "Continue working toward the active thread goal.\n\n<untrusted_objective>\n" +
                "docs/base_plan.md に従ってアプリケーションを完成させて。\n" +
                "必要な情報は docs/ や evaluation/ にある。\n" +
                "</untrusted_objective>",
            },
          ],
        },
      },
    ]);

    expect(parsed).toMatchObject({
      title: "docs/base_plan.md に従ってアプリケーションを完成させて。",
      titleTurnId: null,
      cwds: [path],
      status: "working",
      startedAt: Date.parse("2026-05-03T10:00:01.000Z"),
      sessionKind: "main",
    });
  });

  it("review mode 中の response.completed は working のままにする", () => {
    const state = sessionLogParserService.createParseState();

    sessionLogParserService.updateParseState({
      line: line({ type: "event_msg", payload: { type: "entered_review_mode" } }),
      homeDir: null,
      state,
      skipFirstUserMessage: false,
    });
    sessionLogParserService.updateParseState({
      line: line({
        type: "event_msg",
        payload: { type: "user_message", message: "Review changes" },
      }),
      homeDir: null,
      state,
      skipFirstUserMessage: false,
    });
    sessionLogParserService.updateParseState({
      line: line({ type: "response.completed" }),
      homeDir: null,
      state,
      skipFirstUserMessage: false,
    });

    expect(sessionLogParserService.finalizeParseState(state)).toMatchObject({
      title: "Review changes",
      status: "working",
      sessionKind: "review",
    });
  });

  it("承認待ち function_call と output による待機解除を解析する", () => {
    const state = sessionLogParserService.createParseState();

    sessionLogParserService.updateParseState({
      line: line({
        type: "event_msg",
        payload: { type: "user_message", message: "Run command" },
      }),
      homeDir: null,
      state,
      skipFirstUserMessage: false,
    });
    sessionLogParserService.updateParseState({
      line: line({
        type: "response_item",
        payload: {
          type: "function_call",
          name: "exec_command",
          call_id: "call-1",
          arguments: JSON.stringify({ sandbox_permissions: "require_escalated" }),
        },
      }),
      homeDir: null,
      state,
      skipFirstUserMessage: false,
    });
    expect(sessionLogParserService.finalizeParseState(state).isWaitingForUser).toBe(true);

    sessionLogParserService.updateParseState({
      line: line({
        type: "response_item",
        payload: { type: "function_call_output", call_id: "call-1", output: "approved" },
      }),
      homeDir: null,
      state,
      skipFirstUserMessage: false,
    });

    expect(sessionLogParserService.finalizeParseState(state).isWaitingForUser).toBe(false);
  });

  it("SKILL.md 読み込みと assistant commentary からスキル使用履歴を解析する", () => {
    const result = parseLines([
      {
        timestamp: "2026-05-03T10:00:00.000Z",
        type: "response_item",
        payload: {
          type: "function_call",
          name: "exec_command",
          arguments: JSON.stringify({
            cmd: "sed -n '1,220p' /Users/me/.codex/skills/.system/imagegen/SKILL.md",
          }),
        },
      },
      {
        timestamp: "2026-05-03T10:00:01.000Z",
        type: "event_msg",
        payload: {
          type: "agent_message",
          message: "imagegen スキルで画像を生成します。",
        },
      },
      {
        timestamp: "2026-05-03T10:05:00.000Z",
        type: "response_item",
        payload: {
          type: "message",
          role: "assistant",
          content: [{ type: "output_text", text: "Using the Computer Use skill because the app UI must be checked." }],
          phase: "commentary",
        },
      },
      {
        timestamp: "2026-05-03T10:10:00.000Z",
        type: "event_msg",
        payload: {
          type: "agent_message",
          message: "review-by-sub-agents を使います。",
        },
      },
    ]);

    expect(result.skillUsages).toEqual([
      { name: "imagegen", timestamp: "2026-05-03T10:00:00.000Z" },
      { name: "Computer Use", timestamp: "2026-05-03T10:05:00.000Z" },
      { name: "review-by-sub-agents", timestamp: "2026-05-03T10:10:00.000Z" },
    ]);
  });

  it("user message の skill ブロックからスキル使用履歴を解析する", () => {
    const result = parseLines([
      {
        timestamp: "2026-05-03T10:00:00.000Z",
        type: "response_item",
        payload: {
          type: "message",
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "$review-by-sub-agents 1spawn\n" +
                "<skill>\n" +
                "<name>review-by-sub-agents</name>\n" +
                "<path>/Users/me/.codex/skills/review-by-sub-agents/SKILL.md</path>\n" +
                "---\n" +
                "name: review-by-sub-agents\n" +
                "</skill>",
            },
          ],
        },
      },
      {
        timestamp: "2026-05-03T10:00:01.000Z",
        type: "event_msg",
        payload: {
          type: "agent_message",
          message: "review-by-sub-agents スキルを使います。",
        },
      },
    ]);

    expect(result.skillUsages).toEqual([{ name: "review-by-sub-agents", timestamp: "2026-05-03T10:00:00.000Z" }]);
  });

  it("説明文中のスキル使用例を実使用として扱わない", () => {
    const result = parseLines([
      {
        timestamp: "2026-05-03T10:00:00.000Z",
        type: "event_msg",
        payload: {
          type: "agent_message",
          message: "自然文の推測だと「xxx スキルを使います」のような説明文も拾ってしまいます。",
        },
      },
      {
        timestamp: "2026-05-03T10:01:00.000Z",
        type: "response_item",
        payload: {
          type: "message",
          role: "assistant",
          content: [
            {
              type: "output_text",
              text: "同じターンで review-by-sub-agents スキルを使います の commentary が続いても重複しません。",
            },
          ],
          phase: "commentary",
        },
      },
      {
        timestamp: "2026-05-03T10:02:00.000Z",
        type: "response_item",
        payload: {
          type: "message",
          role: "assistant",
          content: [
            {
              type: "output_text",
              text: "review-by-sub-agents スキルを使います、という例示を最終回答に含めても実使用ではありません。",
            },
          ],
          phase: "final_answer",
        },
      },
      {
        timestamp: "2026-05-03T10:03:30.000Z",
        type: "response_item",
        payload: {
          type: "message",
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "<skill>\n" +
                "<name>review-by-sub-agents</name>\n" +
                "<path>/Users/me/.codex/skills/review-by-sub-agents/SKILL.md</path>\n" +
                "</skill>",
            },
          ],
        },
      },
      {
        timestamp: "2026-05-03T10:03:40.000Z",
        type: "response_item",
        payload: {
          type: "function_call",
          name: "exec_command",
          arguments: JSON.stringify({
            cmd: "sed -n '1,220p' /Users/me/.codex/skills/review-by-sub-agents/SKILL.md",
          }),
        },
      },
    ]);

    expect(result.skillUsages).toEqual([{ name: "review-by-sub-agents", timestamp: "2026-05-03T10:03:30.000Z" }]);
  });

  it.each([
    {
      name: "cli",
      source: "cli",
      sessionKind: "main",
      parentThreadId: null,
    },
    {
      name: "vscode",
      source: "vscode",
      sessionKind: "main",
      parentThreadId: null,
    },
    {
      name: "subagent string",
      source: "subagent",
      sessionKind: "subagent",
      parentThreadId: null,
    },
    {
      name: "review subagent",
      source: { subagent: "review" },
      sessionKind: "reviewSubagent",
      parentThreadId: null,
    },
    {
      name: "named subagent",
      source: { subagent: "worker" },
      sessionKind: "subagent",
      parentThreadId: null,
    },
    {
      name: "thread spawn subagent",
      source: {
        subagent: {
          thread_spawn: {
            parent_thread_id: "parent-thread",
            depth: 1,
            agent_path: null,
            agent_nickname: "Worker",
            agent_role: null,
          },
        },
      },
      sessionKind: "subagent",
      parentThreadId: "parent-thread",
    },
    {
      name: "guardian subagent",
      source: { subagent: { other: "guardian" } },
      sessionKind: "autoReview",
      parentThreadId: null,
    },
    {
      name: "unknown object subagent",
      source: { subagent: { custom: "value" } },
      sessionKind: "subagent",
      parentThreadId: null,
    },
    {
      name: "unknown source object",
      source: { custom: "value" },
      sessionKind: "main",
      parentThreadId: null,
    },
  ])("session_meta source の $name を $sessionKind として解析する", ({ source, sessionKind, parentThreadId }) => {
    const result = parseLines([
      {
        type: "session_meta",
        payload: {
          id: "thread-id",
          source,
        },
      },
    ]);

    expect(result.sessionKind).toBe(sessionKind);
    expect(result.parentThreadId).toBe(parentThreadId);
  });

  it("turn_context の codex-auto-review model を autoReview として解析する", () => {
    const result = parseLines([
      {
        type: "turn_context",
        payload: {
          model: "codex-auto-review",
        },
      },
    ]);

    expect(result.sessionKind).toBe("autoReview");
  });

  it("subagent source と review event が同じセッションにあれば reviewSubagent として解析する", () => {
    const result = parseLines([
      {
        type: "session_meta",
        payload: {
          source: "subagent",
        },
      },
      {
        type: "event_msg",
        payload: {
          type: "entered_review_mode",
        },
      },
    ]);

    expect(result.sessionKind).toBe("reviewSubagent");
  });
});
