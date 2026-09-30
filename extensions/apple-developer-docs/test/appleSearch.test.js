const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { after, describe, it } = require("node:test");
const { createAppleSearchRequest, parseAppleSearchResponse } = require("../.test-dist/appleSearch.js");

after(() => {
  fs.rmSync(path.resolve(__dirname, "../.test-dist"), { recursive: true, force: true });
});

describe("Apple Developer search API", () => {
  it("requests the current JSONL query endpoint", () => {
    const request = createAppleSearchRequest("SwiftUI");

    assert.equal(request.url, "https://devintserv.msc.sbz.apple.com/api/v1/query?q=SwiftUI");
    assert.equal(request.options.method, "POST");
    assert.equal(request.options.headers.Accept, "application/jsonl");
    assert.deepEqual(JSON.parse(request.options.body), {
      text: "SwiftUI",
      targetResultLocale: "en",
      includedResponses: ["quickSearch", "search"],
    });
  });

  it("applies streamed search revisions and normalizes the final results", async () => {
    const quickResult = {
      metadata: {
        metadataKind: "webPage",
        title: "Quick result",
        sourceURL: "https://developer.apple.com/swiftui/",
      },
      origin: "developerWeb",
    };
    const oldPayload = JSON.stringify({
      results: [
        {
          value: {
            metadata: {
              metadataKind: "documentation",
              title: "Old result",
              permalink: "https://developer.apple.com/documentation/swiftui/old",
            },
            origin: "documentation",
          },
        },
      ],
    });
    const newPayload = JSON.stringify({
      results: [
        {
          value: {
            metadata: {
              metadataKind: "documentation",
              title: "New result",
              description: "Current documentation",
              permalink: "https://developer.apple.com/documentation/swiftui/new",
              hierarchy: "SwiftUI > Essentials",
              availability: "iOS 27.0+ | macOS 27.0+",
              kind: "sampleCode",
            },
            origin: "documentation",
          },
        },
      ],
    });
    let commonPrefixLength = 0;
    while (
      commonPrefixLength < oldPayload.length &&
      commonPrefixLength < newPayload.length &&
      oldPayload[commonPrefixLength] === newPayload[commonPrefixLength]
    ) {
      commonPrefixLength += 1;
    }
    const body = [
      { kind: "quickSearch", response: { results: [quickResult] } },
      { kind: "search", diff: { append: oldPayload, removeLast: 0 } },
      {
        kind: "search",
        diff: {
          append: newPayload.slice(commonPrefixLength),
          removeLast: oldPayload.length - commonPrefixLength,
        },
      },
      { kind: "searchFinished" },
    ]
      .map((event) => JSON.stringify(event))
      .join("\n");

    const result = await parseAppleSearchResponse(new Response(body), 30);

    assert.deepEqual(result.results, [
      {
        title: "New result",
        description: "Current documentation",
        url: "https://developer.apple.com/documentation/swiftui/new",
        type: "sample_code",
        order: 0,
        platform: ["iOS", "macOS"],
        breadcrumbs: ["SwiftUI", "Essentials"],
        date: "",
        event_name: "",
        session_id: "",
        tile_image: "",
        relevance: 0,
        is_beta: 0,
        language: "",
        lang_children: [],
        duration: undefined,
      },
    ]);
  });
  it("falls back to quick results when a later JSONL event is truncated", async () => {
    const body = `${JSON.stringify({
      kind: "quickSearch",
      response: {
        results: [
          {
            metadata: {
              metadataKind: "webPage",
              title: "Quick result",
              description: "Available before the stream failed",
              sourceURL: "https://developer.apple.com/swiftui/",
            },
          },
        ],
      },
    })}\n{"kind":"search","diff":`;

    const result = await parseAppleSearchResponse(new Response(body), 30);

    assert.deepEqual(result.results, [
      {
        title: "Quick result",
        description: "Available before the stream failed",
        url: "https://developer.apple.com/swiftui/",
        type: "general",
        order: 0,
        platform: [],
        breadcrumbs: [],
        date: "",
        event_name: "",
        session_id: "",
        tile_image: "",
        relevance: 0,
        is_beta: 0,
        language: "",
        lang_children: [],
        duration: undefined,
      },
    ]);
  });
});
