import { describe, expect, it } from "vitest";

import { buildSessionDetailDisplay, filterSessionMessagesForDisplay } from "./session-detail";
import type { SessionMessage } from "../domain/session-detail.service";

describe("filterSessionMessagesForDisplay", () => {
  it("レビュータイトルの場合はassistantのみ返す", () => {
    const messages: SessionMessage[] = [
      { role: "user", text: "Review prompt", timestamp: "2024-01-01T00:00:00.000Z" },
      { role: "assistant", text: "Review output", timestamp: "2024-01-01T00:01:00.000Z" },
    ];

    const result = filterSessionMessagesForDisplay({
      title: "Review the current code changes (staged, unstaged, and untracked files)",
      messages,
    });

    expect(result).toEqual([{ role: "assistant", text: "Review output", timestamp: "2024-01-01T00:01:00.000Z" }]);
  });

  it("レビュー以外はそのまま返す", () => {
    const messages: SessionMessage[] = [
      { role: "user", text: "Question", timestamp: "2024-01-01T00:00:00.000Z" },
      { role: "assistant", text: "Answer", timestamp: "2024-01-01T00:01:00.000Z" },
    ];

    const result = filterSessionMessagesForDisplay({
      title: "Implement the feature",
      messages,
    });

    expect(result).toEqual(messages);
  });
});

describe("buildSessionDetailDisplay", () => {
  it("レビューでassistantが無い場合は専用メッセージを返す", () => {
    const messages: SessionMessage[] = [{ role: "user", text: "Review prompt", timestamp: "2024-01-01T00:00:00.000Z" }];

    const result = buildSessionDetailDisplay({
      title: "Review the current code changes (staged, unstaged, and untracked files)",
      messages,
    });

    expect(result).toEqual({
      messages: [],
      emptyMessage: "No assistant messages yet.",
    });
  });

  it("レビューでassistantがある場合はメッセージを返す", () => {
    const messages: SessionMessage[] = [
      { role: "user", text: "Review prompt", timestamp: "2024-01-01T00:00:00.000Z" },
      { role: "assistant", text: "Review output", timestamp: "2024-01-01T00:01:00.000Z" },
    ];

    const result = buildSessionDetailDisplay({
      title: "Review the current code changes (staged, unstaged, and untracked files)",
      messages,
    });

    expect(result).toEqual({
      messages: [{ role: "assistant", text: "Review output", timestamp: "2024-01-01T00:01:00.000Z" }],
      emptyMessage: null,
    });
  });

  it("レビュー以外は空メッセージを返さない", () => {
    const messages: SessionMessage[] = [{ role: "user", text: "Question", timestamp: "2024-01-01T00:00:00.000Z" }];

    const result = buildSessionDetailDisplay({
      title: "Implement the feature",
      messages,
    });

    expect(result).toEqual({
      messages,
      emptyMessage: null,
    });
  });
});
