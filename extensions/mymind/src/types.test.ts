import test from "node:test";
import assert from "node:assert/strict";
import { MyMindObjectSchema } from "./types";

const baseObject = {
  id: "a1B2c3D4e5F6g7H8i9J0k1",
  tags: [],
  created: "2024-03-01T12:00:00Z",
  modified: "2024-03-01T12:00:00Z",
  bumped: "2024-03-01T12:00:00Z",
};

test("parses null title and other nullable top-level fields as undefined", () => {
  const parsed = MyMindObjectSchema.parse({
    ...baseObject,
    title: null,
    summary: null,
    url: null,
    source: null,
    content: null,
    mainEntity: null,
    notes: null,
    spaces: null,
  });

  assert.equal(parsed.title, undefined);
  assert.equal(parsed.summary, undefined);
  assert.equal(parsed.url, undefined);
  assert.equal(parsed.source, undefined);
  assert.equal(parsed.content, undefined);
  assert.equal(parsed.mainEntity, undefined);
  assert.equal(parsed.notes, undefined);
  assert.equal(parsed.spaces, undefined);
});

test("parses nested null source url as undefined", () => {
  const parsed = MyMindObjectSchema.parse({
    ...baseObject,
    source: {
      url: null,
    },
  });

  assert.deepEqual(parsed.source, { url: undefined });
});

test("parses nullable blob and tag metadata without failing the object", () => {
  const parsed = MyMindObjectSchema.parse({
    ...baseObject,
    blob: {
      path: null,
      type: "image/png",
      url: null,
      width: null,
      height: null,
    },
    tags: [
      {
        name: "design",
        id: null,
        flags: null,
        count: null,
        modified: null,
      },
    ],
  });

  assert.deepEqual(parsed.blob, {
    path: undefined,
    type: "image/png",
    url: undefined,
    width: undefined,
    height: undefined,
  });
  assert.deepEqual(parsed.tags, [
    {
      name: "design",
      id: undefined,
      flags: undefined,
      count: undefined,
      modified: undefined,
    },
  ]);
});

test("preserves valid content and fallback-relevant fields", () => {
  const parsed = MyMindObjectSchema.parse({
    ...baseObject,
    title: null,
    mainEntity: {
      "@type": ["Article", "Thing"],
      name: "Design Systems",
      description: "A topic entity",
      url: "https://example.com/entities/design-systems",
    },
    content: {
      type: "text/markdown",
      body: "# hello",
    },
    notes: [
      {
        id: "n4K8m2N6p9Q3r5T7v1X0z2",
        content: {
          type: "text/markdown",
          body: "Follow up later",
        },
      },
    ],
  });

  assert.equal(parsed.title, undefined);
  assert.deepEqual(parsed.mainEntity?.["@type"], ["Article", "Thing"]);
  assert.equal(parsed.mainEntity?.name, "Design Systems");
  assert.equal(parsed.content?.type, "text/markdown");
  assert.equal(parsed.notes?.[0].content?.body, "Follow up later");
});
