import { describe, expect, it } from "vitest";
import {
  SkippedFieldSink,
  createJsonStringFieldSkipper,
  streamJsonObjectsSkippingField,
} from "./strip-json-string-field";

function skipJsonStringFieldInObjects<T>(
  json: string,
  field: string,
  onObject: (json: string, skipped: T | null) => void,
  createSink?: () => SkippedFieldSink<T>,
): { sawList: boolean; complete: boolean } {
  const skipper = createJsonStringFieldSkipper(field, onObject, createSink);
  skipper.push(json);
  return { sawList: skipper.sawList(), complete: skipper.complete() };
}

function collect(json: string): { items: unknown[]; sawList: boolean; complete: boolean } {
  const items: unknown[] = [];
  const result = skipJsonStringFieldInObjects(json, "avatarDataUrl", (item) => {
    items.push(JSON.parse(item));
  });
  return { items, ...result };
}

function collectingSink(): SkippedFieldSink<string> {
  let buf = "";
  let failed = false;
  return {
    write(unescaped: string) {
      if (!failed) {
        buf += unescaped;
      }
    },
    abort() {
      failed = true;
      buf = "";
    },
    end() {
      if (failed || buf.length === 0) {
        return null;
      }
      return buf;
    },
  };
}

function collectWithSidecar(json: string): {
  items: unknown[];
  sidecars: (string | null)[];
  sawList: boolean;
  complete: boolean;
} {
  const items: unknown[] = [];
  const sidecars: (string | null)[] = [];
  const result = skipJsonStringFieldInObjects(
    json,
    "avatarDataUrl",
    (item, skippedField) => {
      items.push(JSON.parse(item));
      sidecars.push(skippedField);
    },
    collectingSink,
  );
  return { items, sidecars, ...result };
}

describe("createJsonStringFieldSkipper", () => {
  it("does not emit a bare object, only list items", () => {
    const json = '{"id":"a1","avatarDataUrl":"data:image/png;base64,abc","name":"Piper"}';
    expect(collect(json)).toEqual({
      items: [],
      sawList: false,
      complete: true,
    });
  });

  it("emits each top-level array object after dropping the field", () => {
    const blob = "a".repeat(20_000);
    const json = `[{"avatarDataUrl":"data:image/png;base64,${blob}","id":"a1","name":"Piper"}]`;
    const result = collect(json);
    expect(result.sawList).toBe(true);
    expect(result.complete).toBe(true);
    expect(JSON.stringify(result.items).includes(blob)).toBe(false);
    expect(result.items).toEqual([{ avatarDataUrl: null, id: "a1", name: "Piper" }]);
  });

  it("emits objects from an agents wrapper", () => {
    const blob = "c".repeat(8000);
    const json = `{"agents":[{"id":"a1","avatarDataUrl":"${blob}","name":"Piper"},{"id":"a2","name":"Scout"}]}`;
    expect(collect(json).items).toEqual([
      { id: "a1", avatarDataUrl: null, name: "Piper" },
      { id: "a2", name: "Scout" },
    ]);
  });

  it("ignores a field whose value is not a string", () => {
    const json = '[{"avatarDataUrl":null,"id":"a1"}]';
    expect(collect(json).items).toEqual([{ avatarDataUrl: null, id: "a1" }]);
  });

  it("does not treat the field name inside another string as a key", () => {
    const json = '[{"description":"see avatarDataUrl later","avatarDataUrl":"SECRET","name":"Piper"}]';
    expect(collect(json).items).toEqual([
      { description: "see avatarDataUrl later", avatarDataUrl: null, name: "Piper" },
    ]);
  });

  it("strips across 1-character chunks", () => {
    const blob = "b".repeat(4000);
    const json = `[{"id":"a1","avatarDataUrl":"${blob}","name":"Piper"}]`;
    const items: unknown[] = [];
    const skipper = createJsonStringFieldSkipper("avatarDataUrl", (item) => {
      items.push(JSON.parse(item));
    });
    for (const character of json) {
      skipper.push(character);
    }
    expect(JSON.stringify(items).includes(blob)).toBe(false);
    expect(items).toEqual([{ id: "a1", avatarDataUrl: null, name: "Piper" }]);
    expect(skipper.complete()).toBe(true);
  });

  it("emits each top-level array object as it closes", () => {
    const blob = "c".repeat(8000);
    const json = `[{"id":"a1","avatarDataUrl":"${blob}","name":"Piper"},{"id":"a2","name":"Scout"}]`;
    const items: unknown[] = [];
    const skipper = createJsonStringFieldSkipper("avatarDataUrl", (item) => {
      items.push(JSON.parse(item));
    });
    const chunkSize = 17;
    for (let index = 0; index < json.length; index += chunkSize) {
      skipper.push(json.slice(index, index + chunkSize));
    }
    expect(items).toEqual([
      { id: "a1", avatarDataUrl: null, name: "Piper" },
      { id: "a2", name: "Scout" },
    ]);
  });

  it("marks an empty array as a complete list with no objects", () => {
    expect(collect("[]")).toEqual({ items: [], sawList: true, complete: true });
    expect(collect('{"agents":[]}')).toEqual({ items: [], sawList: true, complete: true });
  });

  it("passes null as the second argument when no sink is provided", () => {
    const json = `[{"avatarDataUrl":"data:image/png;base64,abc","id":"a1"}]`;
    const sidecars: (string | null)[] = [];
    skipJsonStringFieldInObjects(json, "avatarDataUrl", (_item: string, skipped: string | null) => {
      sidecars.push(skipped);
    });
    expect(sidecars).toEqual([null]);
  });

  it("streams skipped field bytes to the sink without putting them in the agent JSON", () => {
    const blob = "a".repeat(20_000);
    const dataUrl = `data:image/png;base64,${blob}`;
    const json = `[{"avatarDataUrl":"${dataUrl}","id":"a1","name":"Piper"}]`;
    const result = collectWithSidecar(json);
    expect(result.sidecars).toEqual([dataUrl]);
    expect(result.items).toEqual([{ avatarDataUrl: null, id: "a1", name: "Piper" }]);
    expect(JSON.stringify(result.items).includes(blob)).toBe(false);
  });

  it("passes null as the second callback argument when the field is absent", () => {
    const json = `[{"id":"a2","name":"Scout"}]`;
    const result = collectWithSidecar(json);
    expect(result.sidecars).toEqual([null]);
    expect(result.items).toEqual([{ id: "a2", name: "Scout" }]);
  });
});

describe("streamJsonObjectsSkippingField", () => {
  it("reads a web stream without retaining the skipped field", async () => {
    const blob = "d".repeat(12_000);
    const json = `[{"avatarDataUrl":"${blob}","id":"z1"}]`;
    const items: unknown[] = [];
    const streamed = await streamJsonObjectsSkippingField(
      new Response(json).body as ReadableStream<Uint8Array>,
      "avatarDataUrl",
      (item) => {
        items.push(JSON.parse(item));
      },
    );
    expect(streamed.sawList).toBe(true);
    expect(JSON.stringify(items).includes(blob)).toBe(false);
    expect(items).toEqual([{ avatarDataUrl: null, id: "z1" }]);
  });
});
