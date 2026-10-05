import { afterEach, describe, expect, it, vi } from "vitest";

import { assignedTo } from "./entities";

const instance = { baseUrl: "https://acme.tpondemand.com", token: "s3cret", authTransport: "query" as const };

function page(count: number, startId = 1, usable = true) {
  const items = Array.from({ length: count }, (_, index) => ({
    Id: startId + index,
    Name: usable ? `Item ${startId + index}` : undefined,
    EntityType: { Name: "Bug" },
    ModifyDate: `/Date(${1_000_000 + startId + index}+0000)/`,
  }));
  return new Response(JSON.stringify({ Items: items }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

/** Captures the skip/take of every request so paging can be asserted, not inferred. */
function mockPages(...responses: Response[]) {
  const calls: { skip: string | null; take: string | null }[] = [];
  let index = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: URL) => {
      const parsed = url instanceof URL ? url : new URL(String(url));
      calls.push({ skip: parsed.searchParams.get("skip"), take: parsed.searchParams.get("take") });
      const next = responses[Math.min(index, responses.length - 1)];
      index += 1;
      if (!next) throw new Error("no responses configured");
      return next.clone();
    }),
  );
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("assignedTo paging", () => {
  it("stops after one request when the first page is short", async () => {
    const calls = mockPages(page(12));
    const items = await assignedTo(instance, 42);
    expect(items).toHaveLength(12);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.skip).toBe("0");
  });

  it("follows on to a second page when the first is full", async () => {
    const calls = mockPages(page(50, 1), page(7, 51));
    const items = await assignedTo(instance, 42);
    expect(items).toHaveLength(57);
    expect(calls.map((c) => c.skip)).toEqual(["0", "50"]);
  });

  it("keeps paging while every page is full", async () => {
    const calls = mockPages(page(50, 1), page(50, 51), page(3, 101));
    const items = await assignedTo(instance, 42);
    expect(items).toHaveLength(103);
    expect(calls.map((c) => c.skip)).toEqual(["0", "50", "100"]);
  });

  it("stops when an instance ignores skip and returns the same page again", async () => {
    // Every response is the identical full page: repeated ids mean paging is not working.
    const calls = mockPages(page(50, 1));
    const items = await assignedTo(instance, 42);
    expect(items).toHaveLength(50);
    expect(calls).toHaveLength(2);
  });

  it("is bounded when every page is full and genuinely distinct", async () => {
    const pages = Array.from({ length: 25 }, (_, i) => page(50, i * 50 + 1));
    const calls = mockPages(...pages);
    await assignedTo(instance, 42);
    expect(calls).toHaveLength(20);
  });

  it("does not end paging early when a page contains unusable rows", async () => {
    // A full page whose rows are all dropped by mapping: raw count decides, not mapped count.
    const calls = mockPages(page(50, 1, false), page(4, 51));
    const items = await assignedTo(instance, 42);
    expect(items).toHaveLength(4);
    expect(calls).toHaveLength(2);
  });

  it("returns an empty list without a second request", async () => {
    const calls = mockPages(page(0));
    expect(await assignedTo(instance, 42)).toEqual([]);
    expect(calls).toHaveLength(1);
  });

  it("sorts across pages, not within them", async () => {
    const older = new Response(
      JSON.stringify({
        Items: Array.from({ length: 50 }, (_, i) => ({
          Id: i + 1,
          Name: `old ${i}`,
          EntityType: { Name: "Bug" },
          ModifyDate: "/Date(1000+0000)/",
        })),
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
    const newer = new Response(
      JSON.stringify({
        Items: [{ Id: 999, Name: "newest", EntityType: { Name: "Bug" }, ModifyDate: "/Date(9000000+0000)/" }],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
    mockPages(older, newer);
    const items = await assignedTo(instance, 42);
    expect(items[0]?.id).toBe(999);
  });
});
