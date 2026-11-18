import { describe, expect, it, vi } from "vitest";
import { discoverDomainStream, getSurface, IntegrationsHttpError } from "./api";

function streamFromText(text: string) {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text));
      controller.close();
    },
  });
}

describe("getSurface", () => {
  it("throws IntegrationsHttpError with status for missing stored surfaces", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("not found", { status: 404 })),
    );

    await expect(getSurface("missing.example")).rejects.toMatchObject({
      status: 404,
      message: "not found",
    });
    await expect(getSurface("missing.example")).rejects.toBeInstanceOf(IntegrationsHttpError);
  });
});

describe("discoverDomainStream", () => {
  it("yields parsed SSE discovery messages", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          streamFromText(
            [
              'event: progress\ndata: {"message":"Checking docs"}',
              'event: surface\ndata: {"name":"Raycast CLI","type":"cli"}',
              'event: done\ndata: {"version":3,"domain":"raycast.com","surfaces":[]}',
              "",
            ].join("\n\n"),
          ),
          { headers: { "content-type": "text/event-stream" } },
        );
      }),
    );

    const messages = [];
    for await (const message of discoverDomainStream("raycast.com")) {
      messages.push(message);
    }

    expect(messages).toEqual([
      { event: "progress", data: { message: "Checking docs" } },
      { event: "surface", data: { name: "Raycast CLI", type: "cli" } },
      { event: "done", data: { version: 3, domain: "raycast.com", surfaces: [] } },
    ]);
  });

  it("flushes the final SSE block when the stream closes without a trailing double-newline", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          streamFromText(
            'event: progress\ndata: {"message":"Checking docs"}\n\nevent: done\ndata: {"version":3,"domain":"raycast.com","surfaces":[]}',
          ),
          { headers: { "content-type": "text/event-stream" } },
        );
      }),
    );

    const messages = [];
    for await (const message of discoverDomainStream("raycast.com")) {
      messages.push(message);
    }

    expect(messages).toEqual([
      { event: "progress", data: { message: "Checking docs" } },
      { event: "done", data: { version: 3, domain: "raycast.com", surfaces: [] } },
    ]);
  });
});
