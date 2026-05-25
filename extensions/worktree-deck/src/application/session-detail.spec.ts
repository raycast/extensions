import { describe, expect, it } from "vitest";

import { sessionDetailUsecase } from "./session-detail.usecase";

describe("buildDisplay", () => {
  it("レビューでassistantが無い場合は空メッセージを返す", () => {
    const result = sessionDetailUsecase.buildDisplay({
      title: "Review the code",
      messages: [{ role: "user", text: "prompt", timestamp: "2024-01-01T00:00:00.000Z" }],
    });

    expect(result).toEqual({
      messages: [],
      emptyMessage: "No assistant messages yet.",
    });
  });

  it("レビュー以外はそのまま返す", () => {
    const messages = [{ role: "user", text: "prompt", timestamp: "2024-01-01T00:00:00.000Z" }];

    const result = sessionDetailUsecase.buildDisplay({
      title: "Implement feature",
      messages,
    });

    expect(result).toEqual({
      messages,
      emptyMessage: null,
    });
  });
});
