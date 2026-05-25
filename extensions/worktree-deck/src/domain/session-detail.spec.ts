import { describe, expect, it } from "vitest";

import { sessionDetailService, type SessionMessage } from "./session-detail.service";

describe("isReviewSessionTitle", () => {
  it("レビュータイトルを判定する", () => {
    expect(sessionDetailService.isReviewTitle("Review: fix bug")).toBe(true);
    expect(sessionDetailService.isReviewTitle("レビュー 対応")).toBe(true);
    expect(sessionDetailService.isReviewTitle("Implement feature")).toBe(false);
  });
});

describe("filterSessionMessagesForDisplay", () => {
  it("レビュータイトルではassistantのみ返す", () => {
    const messages: SessionMessage[] = [
      { role: "user", text: "prompt", timestamp: "2024-01-01T00:00:00.000Z" },
      { role: "assistant", text: "answer", timestamp: "2024-01-01T00:01:00.000Z" },
    ];

    const result = sessionDetailService.filterDisplayMessages({ title: "Review code", messages });

    expect(result).toEqual([{ role: "assistant", text: "answer", timestamp: "2024-01-01T00:01:00.000Z" }]);
  });
});
