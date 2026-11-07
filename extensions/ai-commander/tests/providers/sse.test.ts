import { describe, expect, it } from "vitest";
import { parseSse, type SseEvent } from "../../src/providers/sse";
import { bytes, chunked, iterate } from "./helpers";

async function parse(chunks: Iterable<Uint8Array>): Promise<SseEvent[]> {
  const events: SseEvent[] = [];
  for await (const event of parseSse(iterate(chunks))) events.push(event);
  return events;
}

describe("parseSse", () => {
  it("reads data-only events", async () => {
    expect(await parse([bytes("data: one\n\ndata: two\n\n")])).toEqual([{ data: "one" }, { data: "two" }]);
  });

  it("reads event and data fields", async () => {
    expect(await parse([bytes("event: ping\ndata: {}\n\n")])).toEqual([{ event: "ping", data: "{}" }]);
  });

  it("joins multi-line data with newlines", async () => {
    expect(await parse([bytes("data: a\ndata: b\ndata:\ndata: c\n\n")])).toEqual([{ data: "a\nb\n\nc" }]);
  });

  it("ignores comments and unknown fields", async () => {
    const input = ": OPENROUTER PROCESSING\n\nid: 7\nretry: 100\nfoo: bar\ndata: x\n\n";
    expect(await parse([bytes(input)])).toEqual([{ data: "x" }]);
  });

  it("removes exactly one space after the colon", async () => {
    expect(await parse([bytes("data:no-space\n\ndata:  two\n\n")])).toEqual([{ data: "no-space" }, { data: " two" }]);
  });

  it("does not dispatch an event name without data", async () => {
    expect(await parse([bytes("event: ping\n\ndata: x\n\n")])).toEqual([{ data: "x" }]);
  });

  it("handles CRLF and bare CR line endings", async () => {
    expect(await parse([bytes("event: a\r\ndata: 1\r\n\r\ndata: 2\r\rdata: 3\n\n")])).toEqual([
      { event: "a", data: "1" },
      { data: "2" },
      { data: "3" },
    ]);
  });

  it("treats a CRLF split across chunks as one line ending", async () => {
    expect(await parse([bytes("data: a\r"), bytes("\ndata: b\r"), bytes("\n\r"), bytes("\n")])).toEqual([
      { data: "a\nb" },
    ]);
  });

  it("keeps multibyte characters split across chunks", async () => {
    const text = "data: Grüße 👋 日本語\n\n";
    expect(await parse(chunked(text, 1))).toEqual([{ data: "Grüße 👋 日本語" }]);
  });

  it("produces the same events for every chunk size", async () => {
    const text = "event: a\r\ndata: ü1\r\n\r\n: c\n\ndata: 👋\ndata: 2\n\n";
    const expected = await parse([bytes(text)]);
    for (let size = 1; size < 12; size++) expect(await parse(chunked(text, size))).toEqual(expected);
  });

  it("dispatches a last event without closing blank line", async () => {
    expect(await parse([bytes("data: [DONE]")])).toEqual([{ data: "[DONE]" }]);
    expect(await parse([bytes("data: [DONE]\n")])).toEqual([{ data: "[DONE]" }]);
  });

  it("strips a BOM at the start", async () => {
    expect(await parse([new Uint8Array([0xef, 0xbb, 0xbf]), bytes("data: x\n\n")])).toEqual([{ data: "x" }]);
  });

  it("stays linear on one long line delivered in tiny chunks", async () => {
    const text = `data: ${"x".repeat(2_000_000)}\n\n`;
    const events = await parse(chunked(text, 16));
    expect(events[0]?.data.length).toBe(2_000_000);
  });
});
