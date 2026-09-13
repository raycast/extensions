import { describe, expect, it } from "vitest";
import { collectArrayItems, decodeStream, streamArrayItems } from "../../../src/lib/argocd/stream";

/** Feeds a string one chunk at a time, so a boundary can be forced anywhere. */
async function* chunked(text: string, size: number): AsyncGenerator<string> {
  for (let index = 0; index < text.length; index += size) {
    yield text.slice(index, index + size);
  }
}

async function stream(text: string, size: number, key = "items"): Promise<unknown[]> {
  const items: unknown[] = [];
  await streamArrayItems(chunked(text, size), { key, onItem: (item) => items.push(item) });
  return items;
}

const LIST = JSON.stringify({
  metadata: { resourceVersion: "9001" },
  items: [
    { metadata: { name: "app-one", namespace: "team-a-apps" }, spec: { project: "team-a" } },
    { metadata: { name: "app-two" }, spec: { project: "team-b", sources: [{ path: "a" }, { path: "b" }] } },
  ],
});

describe("collectArrayItems", () => {
  it("extracts every element of the named array", () => {
    const items = collectArrayItems(LIST, "items") as { metadata: { name: string } }[];
    expect(items.map((item) => item.metadata.name)).toEqual(["app-one", "app-two"]);
  });

  it("returns nothing for an empty array", () => {
    expect(collectArrayItems('{"items":[]}', "items")).toEqual([]);
  });

  it("returns nothing when the key is absent", () => {
    expect(collectArrayItems('{"metadata":{"resourceVersion":"1"}}', "items")).toEqual([]);
  });

  it("returns nothing when the array is null, which is a valid empty answer", () => {
    expect(collectArrayItems('{"items":null}', "items")).toEqual([]);
  });

  it("ignores an array of the same name nested inside an element", () => {
    const text = '{"items":[{"name":"a","items":[{"name":"nested"}]}]}';
    const items = collectArrayItems(text, "items") as { name: string }[];
    expect(items.map((item) => item.name)).toEqual(["a"]);
  });

  it("stops at the end of the array and ignores what follows", () => {
    const text = '{"items":[{"name":"a"}],"metadata":{"resourceVersion":"9"}}';
    expect(collectArrayItems(text, "items")).toHaveLength(1);
  });

  it("tolerates whitespace and newlines between elements", () => {
    const text = '{\n  "items": [\n    {"name": "a"},\n\n    {"name": "b"}\n  ]\n}';
    expect(collectArrayItems(text, "items")).toHaveLength(2);
  });

  it("survives braces, brackets and commas inside strings", () => {
    const text = '{"items":[{"note":"a { b [ c , d ] e }"},{"note":"]}"}]}';
    const items = collectArrayItems(text, "items") as { note: string }[];
    expect(items.map((item) => item.note)).toEqual(["a { b [ c , d ] e }", "]}"]);
  });

  it("survives escaped quotes and backslashes inside strings", () => {
    const text = '{"items":[{"note":"say \\"hi\\""},{"note":"back\\\\slash"},{"note":"trailing\\\\"}]}';
    const items = collectArrayItems(text, "items") as { note: string }[];
    expect(items.map((item) => item.note)).toEqual(['say "hi"', "back\\slash", "trailing\\"]);
  });

  it("handles deeply nested elements", () => {
    const text = '{"items":[{"a":{"b":{"c":[1,2,{"d":[[]]}]}}}]}';
    expect(collectArrayItems(text, "items")).toHaveLength(1);
  });

  it("drops an element that is not valid JSON rather than losing the list", () => {
    const text = '{"items":[{"name":"a"},{"name":},{"name":"c"}]}';
    const items = collectArrayItems(text, "items") as { name: string }[];
    expect(items.map((item) => item.name)).toEqual(["a", "c"]);
  });

  it("finds the array whichever order the top-level keys come in", () => {
    const before = '{"items":[{"name":"a"}],"kind":"ApplicationList"}';
    const after = '{"kind":"ApplicationList","apiVersion":"v1","items":[{"name":"a"}]}';
    expect(collectArrayItems(before, "items")).toHaveLength(1);
    expect(collectArrayItems(after, "items")).toHaveLength(1);
  });

  it("is not fooled by a different key ending in the same name", () => {
    const text = '{"otheritems":[{"name":"wrong"}],"items":[{"name":"right"}]}';
    const items = collectArrayItems(text, "items") as { name: string }[];
    expect(items.map((item) => item.name)).toEqual(["right"]);
  });

  it("works for another key name", () => {
    expect(collectArrayItems('{"appSets":[{"name":"a"},{"name":"b"}]}', "appSets")).toHaveLength(2);
  });
});

describe("streamArrayItems", () => {
  it.each([1, 2, 3, 7, 13, 64, 4096])("produces the same result at chunk size %i", async (size) => {
    const items = (await stream(LIST, size)) as { metadata: { name: string } }[];
    expect(items.map((item) => item.metadata.name)).toEqual(["app-one", "app-two"]);
  });

  it("handles the key straddling a chunk boundary", async () => {
    const text = '{"kind":"ApplicationList","items":[{"name":"a"}]}';
    for (let size = 1; size <= text.length; size++) {
      expect(await stream(text, size)).toHaveLength(1);
    }
  });

  it("handles an escaped quote straddling a chunk boundary", async () => {
    const text = '{"items":[{"note":"say \\"hi\\""}]}';
    for (let size = 1; size <= text.length; size++) {
      const items = (await stream(text, size)) as { note: string }[];
      expect(items[0]?.note).toBe('say "hi"');
    }
  });

  it("emits elements as they complete rather than at the end", async () => {
    const seen: number[] = [];
    let count = 0;
    await streamArrayItems(chunked('{"items":[{"n":1},{"n":2},{"n":3}]}', 8), {
      key: "items",
      onItem: () => seen.push(++count),
    });
    expect(seen).toEqual([1, 2, 3]);
  });

  it("discards a partial element left by a truncated body", async () => {
    const items = await stream('{"items":[{"name":"a"},{"name":"b"', 5);
    expect(items).toHaveLength(1);
  });

  it("returns nothing for an empty body", async () => {
    expect(await stream("", 4)).toEqual([]);
  });

  it("does not retain the whole body: the prelude stays bounded", async () => {
    // A long preamble before the array must not be accumulated while searching for the key.
    const padding = `"pad":"${"x".repeat(200_000)}"`;
    const text = `{${padding},"items":[{"name":"a"}]}`;
    expect(await stream(text, 1024)).toHaveLength(1);
  });
});

describe("decodeStream", () => {
  it("decodes byte chunks to text", async () => {
    async function* bytes() {
      yield new TextEncoder().encode('{"items":[{"name":');
      yield new TextEncoder().encode('"a"}]}');
    }
    const items: unknown[] = [];
    await streamArrayItems(decodeStream(bytes()), { key: "items", onItem: (item) => items.push(item) });
    expect(items).toEqual([{ name: "a" }]);
  });

  it("does not mangle a multi-byte character split across chunks", async () => {
    const encoded = new TextEncoder().encode('{"items":[{"name":"café été"}]}');
    async function* bytes() {
      for (const byte of encoded) {
        yield new Uint8Array([byte]);
      }
    }
    const items: { name: string }[] = [];
    await streamArrayItems(decodeStream(bytes()), {
      key: "items",
      onItem: (item) => items.push(item as { name: string }),
    });
    expect(items[0]?.name).toBe("café été");
  });

  it("accepts a web ReadableStream as well as an async iterable", async () => {
    const readable = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"items":[{"name":"a"}]}'));
        controller.close();
      },
    });
    const items: unknown[] = [];
    await streamArrayItems(decodeStream(readable), { key: "items", onItem: (item) => items.push(item) });
    expect(items).toEqual([{ name: "a" }]);
  });
});
