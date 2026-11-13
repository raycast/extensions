import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import type { WebClient } from "@slack/web-api";
import { createCanvasClient, editCanvas, parseCanvasSectionTypes, readCanvas, CanvasEditInput } from "./canvas";

const canvasId = "F099AT5TEST";
const sectionId = "temp:C:test-section";
const markdown = "# Release test\n\nRelease date: October 7\n\n**Keep this formatting.**\n";
const html = "<h1>Release test</h1><p>Release date: October 7</p><p><strong>Keep this formatting.</strong></p>";

function fixture() {
  const calls: { method: string; args: Record<string, unknown> }[] = [];
  let currentMarkdown = markdown;
  let currentHtml = html;
  let sections = [{ id: sectionId }];
  let richSections: { id: string }[] = [];
  let failure: { method: string; error: string; detail?: string; thrown?: boolean } | undefined;
  const client: Pick<WebClient, "apiCall"> = {
    async apiCall(method, args = {}) {
      calls.push({ method, args });
      if (failure?.method === method) {
        const data = { ok: false, error: failure.error, detail: failure.detail };
        if (failure.thrown) throw { data };
        return data;
      }
      if (method === "canvases.getContent")
        return { ok: true, content: args.content_type === "html" ? currentHtml : currentMarkdown };
      if (method === "canvases.sections.lookup") {
        const criteria = args.criteria as { section_types?: string[] };
        if (criteria.section_types && criteria.section_types.length > 3)
          return { ok: false, error: "invalid_arguments" };
        const richLookup = criteria.section_types?.some(
          (type) => !["any_header", "h1", "h2", "h3", "list", "blockquote", "horizontal_line"].includes(type),
        );
        return {
          ok: true,
          sections: richLookup ? (criteria.section_types?.includes("table") ? richSections : []) : sections,
        };
      }
      assert.equal(method, "canvases.edit");
      return { ok: true };
    },
  };
  return {
    client,
    calls,
    change() {
      currentMarkdown += "Concurrent edit";
      currentHtml += "<p>Concurrent edit</p>";
    },
    setSections(value: { id: string }[]) {
      sections = value;
    },
    setRichSections(value: { id: string }[]) {
      richSections = value;
    },
    fail(value: typeof failure) {
      failure = value;
    },
  };
}

async function editInput(
  f: ReturnType<typeof fixture>,
  operation: CanvasEditInput["operation"] = "replace",
): Promise<CanvasEditInput> {
  const read = await readCanvas(f.client, { canvas: canvasId, containsText: "Release date" });
  return {
    canvas: canvasId,
    operation,
    expectedSnapshot: read.snapshot,
    sectionId,
    containsText: "Release date",
    markdown: "Release date: October 8\n",
  };
}

test("accepts canvas IDs and Slack docs URLs, and rejects invalid references without API calls", async () => {
  const f = fixture();
  for (const value of [` ${canvasId} `, `https://raycastapp.slack.com/docs/TR1N8S0LC/${canvasId}?foo=bar#section`]) {
    const read = await readCanvas(f.client, { canvas: value });
    assert.equal(read.canvasId, canvasId);
  }
  for (const value of [
    "C12345678",
    "https://evilslack.com/docs/T123/F099AT5TEST",
    "https://slack.com.evil.test/docs/T123/F099AT5TEST",
    `http://raycastapp.slack.com/docs/T123/${canvasId}`,
    `https://x:y@raycastapp.slack.com/docs/T123/${canvasId}`,
    "https://raycastapp.slack.com/archives/C12345678",
  ]) {
    const invalid = fixture();
    await assert.rejects(readCanvas(invalid.client, { canvas: value }), /Canvas must/);
    assert.equal(invalid.calls.length, 0);
  }
});

test("returns complete unmodified formats, a snapshot, IDs and criteria, without inventing section bodies", async () => {
  const f = fixture();
  const read = await readCanvas(f.client, { canvas: canvasId, containsText: "Release date" });
  assert.equal(read.markdown, markdown);
  assert.equal(read.html, html);
  assert.match(read.snapshot, /^[a-f0-9]{64}$/);
  assert.deepEqual(read.sections, [{ id: sectionId }]);
  assert.deepEqual(read.lookupCriteria, { contains_text: "Release date" });
  assert.deepEqual(f.calls.find((call) => call.method === "canvases.sections.lookup")?.args, {
    canvas_id: canvasId,
    criteria: { contains_text: "Release date" },
  });
  for (const value of [undefined, "", " , \n"]) {
    const defaultRead = await readCanvas(f.client, { canvas: canvasId, sectionTypes: parseCanvasSectionTypes(value) });
    assert.deepEqual(defaultRead.lookupCriteria, { section_types: ["any_header"] });
  }
  const typedRead = await readCanvas(f.client, {
    canvas: canvasId,
    sectionTypes: parseCanvasSectionTypes("h1,h2\nh3"),
  });
  assert.deepEqual(typedRead.lookupCriteria, { section_types: ["h1", "h2", "h3"] });
});

test("rejects bad input before any API call", async () => {
  const f = fixture();
  await assert.rejects(readCanvas(f.client, { canvas: canvasId, containsText: " " }), /cannot be empty/);
  await assert.rejects(readCanvas(f.client, { canvas: canvasId, sectionTypes: [] }), /Unsupported/);
  await assert.rejects(
    readCanvas(f.client, { canvas: canvasId, sectionTypes: ["h1", "h2", "h3", "table"] }),
    /at most three/,
  );
  assert.equal(f.calls.length, 0);
});

test("blocks whole-canvas replacement and invalid combinations", async () => {
  const f = fixture();
  const input = await editInput(f);
  f.calls.length = 0;
  await assert.rejects(editCanvas(f.client, { ...input, sectionId: undefined }), /whole-canvas/);
  await assert.rejects(editCanvas(f.client, { ...input, containsText: undefined }), /whole-canvas/);
  await assert.rejects(editCanvas(f.client, { ...input, expectedSnapshot: "made-up" }), /snapshot/);
  await assert.rejects(editCanvas(f.client, { ...input, markdown: " " }), /nonempty/);
  await assert.rejects(editCanvas(f.client, { ...input, markdown: "a".repeat(1_048_577) }), /limit/);
  await assert.rejects(editCanvas(f.client, { ...input, operation: "rename" }), /does not accept/);
  await assert.rejects(editCanvas(f.client, { ...input, operation: "delete" }), /does not accept Markdown/);
  assert.equal(f.calls.length, 0);
});

test("stale snapshots never mutate", async () => {
  const f = fixture();
  const input = await editInput(f);
  f.change();
  await assert.rejects(editCanvas(f.client, input), /changed since/);
  assert.equal(
    f.calls.some((call) => call.method === "canvases.edit"),
    false,
  );
});

test("unknown and ambiguous section IDs never mutate", async () => {
  for (const sections of [[], [{ id: "another-id" }], [{ id: sectionId }, { id: "duplicate" }]]) {
    const f = fixture();
    const input = await editInput(f);
    f.setSections(sections);
    await assert.rejects(editCanvas(f.client, input), /Invalid or ambiguous/);
    assert.equal(
      f.calls.some((call) => call.method === "canvases.edit"),
      false,
    );
  }
});

test("refuses replacement/deletion when target text also matches a table", async () => {
  for (const operation of ["replace", "delete"] as const) {
    const f = fixture();
    const input = await editInput(f, operation);
    if (operation === "delete") delete input.markdown;
    f.setRichSections([{ id: "table-parent" }]);
    await assert.rejects(editCanvas(f.client, input), /Unsupported edit target/);
    assert.equal(
      f.calls.some((call) => call.method === "canvases.edit"),
      false,
    );
  }
});

test("all seven operations send exactly one change with the correct Slack payload", async () => {
  for (const operation of [
    "insert_before",
    "insert_after",
    "insert_at_start",
    "insert_at_end",
    "replace",
    "delete",
    "rename",
  ] as const) {
    const f = fixture();
    const input = await editInput(f, operation);
    const targeted = ["insert_before", "insert_after", "replace", "delete"].includes(operation);
    if (!targeted) {
      delete input.sectionId;
      delete input.containsText;
      input.sectionTypes = parseCanvasSectionTypes("");
    }
    if (operation === "delete") delete input.markdown;
    const original = f.client.apiCall;
    f.client.apiCall = async (method, args) => {
      const response = await original(method, args);
      if (method === "canvases.edit" && operation !== "rename") f.change();
      return response;
    };
    const result = await editCanvas(f.client, input);
    assert.equal(result.applied, true);
    assert.ok("snapshot" in result);
    if (operation !== "rename") {
      assert.notEqual(result.snapshot, input.expectedSnapshot);
      assert.equal(result.markdown, `${markdown}Concurrent edit`);
      assert.equal(result.html, `${html}<p>Concurrent edit</p>`);
    }
    const writes = f.calls.filter((call) => call.method === "canvases.edit");
    assert.equal(writes.length, 1);
    assert.deepEqual(writes[0].args, {
      canvas_id: canvasId,
      changes: [
        {
          operation,
          ...(targeted && { section_id: sectionId }),
          ...(operation !== "delete" && {
            [operation === "rename" ? "title_content" : "document_content"]: {
              type: "markdown",
              markdown: input.markdown,
            },
          }),
        },
      ],
    });
  }
});

test("makes SDK platform errors and returned API errors actionable", async () => {
  for (const thrown of [true, false]) {
    for (const [error, message] of [
      ["missing_scope", /reinstall/],
      ["canvas_not_found", /sharing permissions/],
      ["no_permission", /edit access/],
      ["canvas_disabled_user_team", /disabled/],
      ["service_unavailable", /Check canvas access and Slack service status/],
    ]) {
      const f = fixture();
      f.fail({ method: "canvases.getContent", error: error as string, thrown });
      await assert.rejects(readCanvas(f.client, { canvas: canvasId }), message as RegExp);
    }
  }
});

test("unsupported edit content includes Slack's detail without a fallback replacement", async () => {
  const f = fixture();
  const input = await editInput(f);
  f.fail({ method: "canvases.edit", error: "canvas_editing_failed", detail: "Unsupported block type", thrown: true });
  await assert.rejects(editCanvas(f.client, input), /Unsupported block type/);
  assert.equal(f.calls.filter((call) => call.method === "canvases.edit").length, 1);
});

test("read failure after successful mutation reports applied to prevent duplicate edits", async () => {
  const f = fixture();
  const input = await editInput(f);
  const original = f.client.apiCall;
  f.client.apiCall = async (method, args) => {
    const response = await original(method, args);
    if (method === "canvases.edit") f.fail({ method: "canvases.getContent", error: "service_unavailable" });
    return response;
  };
  const result = await editCanvas(f.client, input);
  assert.equal(result.applied, true);
  assert.match(result.verificationError ?? "", /service_unavailable/);
});

test("unsupported response formats fail explicitly", async () => {
  const client: Pick<WebClient, "apiCall"> = {
    async apiCall() {
      return { ok: true, content: {} };
    },
  };
  await assert.rejects(readCanvas(client, { canvas: canvasId }), /unsupported canvas content/);
});

test("Canvas transport never resends requests after lost responses or rate limits", async () => {
  const attempts = { lost: 0, limited: 0 };
  const server = createServer((request, response) => {
    const kind = request.url === "/lost" ? "lost" : "limited";
    attempts[kind]++;
    if (attempts[kind] > 1) {
      response.end(JSON.stringify({ ok: true }));
    } else if (kind === "lost") {
      request.socket.destroy();
    } else {
      response.writeHead(429, { "Retry-After": "1" });
      response.end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const client = createCanvasClient("test-only-token");
    for (const kind of ["lost", "limited"] as const) {
      await assert.rejects(client.apiCall(`http://127.0.0.1:${address.port}/${kind}`), {
        code: kind === "lost" ? "slack_webapi_request_error" : "slack_webapi_rate_limited_error",
      });
      assert.equal(attempts[kind], 1);
    }
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});

test("transport failures explain retry delays and uncertain writes", async () => {
  for (const [error, expected] of [
    [{ code: "slack_webapi_rate_limited_error", retryAfter: 12 }, /Wait 12 seconds/],
    [{ code: "slack_webapi_request_error" }, /no automatic retry/],
  ] as const) {
    const f = fixture();
    const input = await editInput(f);
    const original = f.client.apiCall;
    f.client.apiCall = async (method, args) => {
      if (method === "canvases.edit") throw error;
      return original(method, args);
    };
    await assert.rejects(editCanvas(f.client, input), (failure: unknown) => {
      assert.ok(failure instanceof Error);
      assert.match(failure.message, expected);
      if (error.code === "slack_webapi_request_error") assert.match(failure.message, /edit may have been applied/);
      return true;
    });
  }
});
