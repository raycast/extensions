import { describe, expect, it } from "vitest";
import {
  formatLogCost,
  formatRequestId,
  groupLogs,
  requestMetrics,
} from "./logs";
import type { LogRow } from "./api";

function row(id: number, createdAt: number, model = "gpt-5"): LogRow {
  return {
    id,
    created_at: createdAt,
    model_name: model,
    token_name: "Raycast",
    channel_name: "",
    quota: 120,
    prompt_tokens: 10,
    completion_tokens: 5,
    use_time: 1,
    is_stream: true,
  };
}

describe("log view", () => {
  it("groups rows by local calendar day", () => {
    const now = new Date(2026, 6, 12, 12).getTime();
    const groups = groupLogs(
      [row(1, now / 1000), row(2, now / 1000 - 86400)],
      now,
    );
    expect(groups.map((group) => group.title)).toEqual(["Today", "Yesterday"]);
  });

  it("formats low costs without rounding them to zero", () => {
    expect(formatLogCost(120, 500_000)).toBe("$0.00024");
    expect(formatLogCost(11, 500_000)).toBe("$0.000022");
  });

  it("shortens request IDs for display without changing short IDs", () => {
    expect(formatRequestId("req_1234567890abcdef")).toBe("req_12345678…");
    expect(formatRequestId("req_short")).toBe("req_short");
    expect(formatRequestId(undefined)).toBe("Unavailable");
  });

  it("builds compact request metrics without losing precision", () => {
    const request = row(1, Date.now() / 1000);
    request.quota = 17;
    request.prompt_tokens = 240;
    request.completion_tokens = 103;
    request.use_time = 0;

    expect(requestMetrics(request, 500_000)).toEqual({
      tokens: "343 tok",
      cost: "$0.000034",
      latency: "<1s",
    });
  });
});
