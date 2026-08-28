import { describe, expect, it, vi } from "vitest";
import { parseChatSSEData, streamChatCompletion } from "./streaming-chat";

describe("chat SSE", () => {
  it("parses content, usage, and completion events", () => {
    expect(
      parseChatSSEData(
        '{"choices":[{"delta":{"content":"hello"}}],"usage":{"total_tokens":9}}',
      ),
    ).toEqual({ content: "hello", totalTokens: 9, done: false });
    expect(parseChatSSEData("[DONE]")).toEqual({ done: true });
    expect(parseChatSSEData("not-json")).toBeUndefined();
  });

  it("streams with minimal headers and reports deltas", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(
          'data: {"choices":[{"delta":{"content":"hel"}}]}\n\n' +
            'data: {"choices":[{"delta":{"content":"lo"}}],"usage":{"total_tokens":7}}\n\n' +
            "data: [DONE]\n\n",
          { status: 200, headers: { "Content-Type": "text/event-stream" } },
        ),
      );
    const auth = { getAccessToken: vi.fn().mockResolvedValue("oauth-token") };
    const chunks: string[] = [];

    const result = await streamChatCompletion({
      auth,
      fetch,
      origin: "https://api.everyapi.ai",
      model: "gemini-3-flash",
      messages: [{ role: "user", content: "hi" }],
      onDelta: (value) => chunks.push(value),
    });

    expect(chunks).toEqual(["hel", "lo"]);
    expect(result.totalTokens).toBe(7);
    const headers = new Headers(fetch.mock.calls[0][1].headers);
    expect(headers.get("authorization")).toBe("Bearer oauth-token");
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("accept")).toBe("text/event-stream");
    expect(headers.get("user-agent")).toBeNull();
    expect(headers.get("x-stainless-runtime")).toBeNull();
  });

  it("does not retry a blocked stream", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response('{"error":{"message":"Your request was blocked."}}', {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const auth = { getAccessToken: vi.fn().mockResolvedValue("oauth-token") };

    await expect(
      streamChatCompletion({
        auth,
        fetch,
        origin: "https://api.everyapi.ai",
        model: "gemini-3-flash",
        messages: [{ role: "user", content: "hi" }],
        onDelta: () => undefined,
      }),
    ).rejects.toMatchObject({ status: 403 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
