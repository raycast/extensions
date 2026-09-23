import { describe, it, mock } from "bun:test";
import assert from "node:assert/strict";

const calls: string[][] = [];
const storage = new Map<string, string>();
const frame = {
  frame_id: 10,
  timestamp: "2026-09-09T17:30:00+08:00",
  application: "Example",
  domain: "example.com",
  url: "https://example.com/doc?a=1",
  title: "Example Document",
  ocr_text: "Raycast example",
  warnings: ["Overlay detected"],
};
let fail = false;
let searchFrames: (typeof frame)[] | undefined;
let coverFrames: (typeof frame)[] | undefined;
const opened: string[] = [];
const toasts: { title: string; message: string }[] = [];
mock.module("@raycast/api", () => ({
  Action: Object.assign(() => null, { OpenInBrowser: () => null }),
  Icon: { Clock: "clock" },
  Toast: { Style: { Failure: "failure" } },
  open: async (url: string) => {
    opened.push(url);
  },
  showToast: async (toast: { title: string; message: string }) => {
    toasts.push(toast);
  },
  getPreferenceValues: () => ({ coastPath: "/fixture/coast" }),
  LocalStorage: {
    getItem: async (key: string) => storage.get(key),
    setItem: async (key: string, value: string) => {
      storage.set(key, value);
    },
  },
}));
// Match execFile's custom promisified result without spawning or retaining private captures.
mock.module("node:child_process", () => ({
  execFile: (
    _binary: string,
    args: string[],
    _options: unknown,
    callback: (error: Error | null, output?: { stdout: string }) => void,
  ) => {
    calls.push(args);
    if (fail) {
      callback(new Error("bridge unavailable"));
      return;
    }
    const command = args.filter((arg) => arg !== "--json");
    let result: unknown;
    if (command[0] === "list")
      result =
        command[1] === "applications"
          ? Array.from({ length: 40 }, (_, index) => ({
              bundle_id: `com.example.${index}`,
              display_name: `Example ${index}`,
            }))
          : Array.from({ length: 35 }, (_, index) => `example${index}.com`);
    else if (command[0] === "usage" && command[1] === "sessions")
      result = {
        session_count: 73,
        total_duration_seconds: 730,
        total_duration_seconds_human: "12m 10s",
        sessions: Array.from({ length: 73 }, (_, index) => ({
          start_ms: index,
          end_ms: index + 1,
          start: frame.timestamp,
          end: frame.timestamp,
          frame_count: 1,
          duration_seconds: 10,
          duration_human: "10s",
        })),
      };
    else if (command[1] === "fts")
      result = (searchFrames || [frame]).slice(
        0,
        Number(command[command.indexOf("--limit") + 1]),
      );
    else if (command[1] === "frame") result = frame;
    else if (command[1] === "sample")
      result = {
        segment_count: 2,
        segments: [
          {
            selected_frame: {
              ...frame,
              frame_id: 12,
              timestamp: "2026-09-09T18:30:00+08:00",
            },
            frame_count: 5,
            duration: "1m",
          },
          { selected_frame: frame, frame_count: 3, duration: "1m" },
        ],
      };
    else if (command[1] === "ocrboxes")
      result = {
        ...frame,
        boxes: [
          { x: 0, y: 0, width: 10, height: 10, text: "Example" },
          { x: 0, y: 10, width: 10, height: 10, text: "Document" },
        ],
      };
    else if (command[0] === "grab-screen")
      result = {
        ...frame,
        image_path: "/tmp/synthetic-coast.png",
        ocr_text: "x".repeat(10001),
      };
    else if (command[1] === "image") {
      callback(null, { stdout: "/tmp/synthetic-coast.png" });
      return;
    } else if (command[1] === "axtree")
      result = {
        ...frame,
        has_tree: true,
        tree_text: "AXButton Open",
        is_partial_tree: true,
        stored_bytes: 0,
        total_node_count: 1,
      };
    else if (command[1] === "cover")
      result = {
        frames: coverFrames || [
          frame,
          { ...frame, frame_id: 11, timestamp: "2026-09-09T17:31:00+08:00" },
        ],
        total_count: 2,
        selected_count: 2,
      };
    else if (command[0] === "link") {
      callback(null, {
        stdout: "coast://timeline?at=2026-09-09T17:30:00%2B08:00",
      });
      return;
    } else throw new Error(`Unexpected fixture command ${command.join(" ")}`);
    callback(null, { stdout: JSON.stringify(result) });
  },
}));
const search = (await import("../src/tools/search-captures")).default;
const capture = (await import("../src/tools/get-capture")).default;
const image = (await import("../src/tools/get-capture-image")).default;
const accessibility = (await import("../src/tools/get-accessibility-tree"))
  .default;
const link = (await import("../src/tools/create-coast-link")).default;
const adjacent = (await import("../src/tools/get-adjacent-moment")).default;
const explore = (await import("../src/tools/explore-around-moment")).default;
const boxes = (await import("../src/tools/get-ocr-boxes")).default;
const currentScreen = (await import("../src/tools/capture-current-screen"))
  .default;
const recentActivity = (await import("../src/tools/recent-activity")).default;
const coastFilters = (await import("../src/tools/list-coast-filters")).default;
const { loadTimeline } = await import("../src/timeline-data");
const { searchCapturePage } = await import("../src/coast");
const { loadSearchResults } = await import("../src/search-data");
const { loadGalleryFrames, filterGalleryFrames } =
  await import("../src/gallery-data");
const { relatedReason, orderedFrames } = await import("../src/discovery");
const { saveSearch, listSavedSearches, runSavedSearch } =
  await import("../src/saved");
const { InspectorOpenActions } = await import("../src/inspector-open-actions");

describe("Inspector opening actions", () => {
  it("keeps Coast first and the recorded URL second for the selected capture", async () => {
    const [primary, secondary] = InspectorOpenActions({ capture: frame }).props
      .children;
    assert.equal(primary.props.title, "Open in Coast");
    assert.equal(secondary.props.title, "Open Original URL");
    assert.equal(secondary.props.url, frame.url);
    await primary.props.onAction();
    assert.ok(opened.at(-1)?.startsWith("coast://"));
    const nextFrame = {
      ...frame,
      timestamp: "2026-09-09T17:31:00+08:00",
      url: "https://example.com/next",
    };
    const [nextPrimary, nextSecondary] = InspectorOpenActions({
      capture: nextFrame,
    }).props.children;
    await nextPrimary.props.onAction();
    assert.ok(calls.at(-1)?.includes(nextFrame.timestamp));
    assert.equal(nextSecondary.props.url, nextFrame.url);
  });
  it("keeps Coast primary without a URL and reports bridge failure without opening anything", async () => {
    const [primary, secondary] = InspectorOpenActions({
      capture: { ...frame, url: null },
    }).props.children;
    assert.equal(primary.props.title, "Open in Coast");
    assert.equal(secondary, null);
    const count = opened.length;
    fail = true;
    try {
      await primary.props.onAction();
      assert.equal(opened.length, count);
      assert.equal(toasts.at(-1)?.title, "Could Not Open in Coast");
      assert.match(toasts.at(-1)!.message, /bridge unavailable/);
    } finally {
      fail = false;
    }
  });
});

describe("Raycast tool chain over the real CLI wrapper with synthetic transport", () => {
  it("pages sessions and filter identifiers without losing source totals", async () => {
    const first = await recentActivity({
      tr: "2026-09-09",
      appFilters: ["com.example"],
    });
    const last = await recentActivity(first.next_input!);
    assert.equal(first.sessions.length, 50);
    assert.equal(first.session_count, 73);
    assert.equal(first.total_duration_seconds, 730);
    assert.equal(last.sessions.length, 23);
    assert.equal(last.next_input, undefined);
    assert.deepEqual(first.next_input?.appFilters, ["com.example"]);
    const filters = await coastFilters({});
    const remaining = await coastFilters(filters.next_input!);
    assert.equal(filters.applications.length, 40);
    assert.equal(filters.domains.length, 10);
    assert.equal(filters.pagination.total_count, 75);
    assert.equal(remaining.domains.length, 25);
    assert.equal(remaining.next_input, undefined);
  });
  it("reaches every search result beyond 20 and 200, including tied timestamps", async () => {
    searchFrames = Array.from({ length: 231 }, (_, index) => ({
      ...frame,
      frame_id: index + 1,
    }));
    try {
      const ids: number[] = [];
      let input: Parameters<typeof searchCapturePage>[0] | undefined = {
        query: "Raycast",
        tr: "2026-09-09",
        appFilters: ["com.example"],
        limit: 20,
      };
      while (input) {
        const page = await searchCapturePage(input);
        ids.push(...page.results.map((item) => item.frame_id));
        assert.equal(page.scope.tr, "2026-09-09");
        assert.deepEqual(page.scope.appFilters, ["com.example"]);
        assert.equal(
          page.pagination.total_count,
          page.pagination.has_more ? undefined : 231,
        );
        input = page.next_input;
      }
      assert.deepEqual(
        ids,
        searchFrames.map((item) => item.frame_id),
      );
      const limited = await searchCapturePage({ query: "Raycast", limit: 3 });
      assert.equal(limited.results.length, 3);
      assert.match(limited.scope.tr!, /^before:/);
      assert.equal(limited.next_input?.tr, limited.scope.tr);
      const first = await loadSearchResults({ query: "Raycast" }, 20);
      const all = await loadSearchResults(first.scope, 240);
      assert.equal(first.results.length, 20);
      assert.equal(first.hasMore, true);
      assert.equal(all.results.length, 231);
      assert.equal(all.hasMore, false);
      assert.equal(all.scope.tr, first.scope.tr);
    } finally {
      searchFrames = undefined;
    }
  });
  it("keeps all gallery frames past 120 and filters titles beyond the first page", async () => {
    coverFrames = Array.from({ length: 151 }, (_, index) => ({
      ...frame,
      frame_id: index + 1,
      title: index === 150 ? "Hidden Needle" : "Example",
    }));
    try {
      const frames = await loadGalleryFrames({ tr: "2026-09-09" }, true);
      assert.equal(frames.length, 151);
      assert.deepEqual(
        filterGalleryFrames(frames, "needle").map((item) => item.frame_id),
        [151],
      );
    } finally {
      coverFrames = undefined;
    }
  });
  it("searches, looks up, inspects image and accessibility, and creates a deep link", async () => {
    const results = await search({ query: "Raycast", tr: "2026-09-09" });
    const id = results.results[0].frame_id;
    const found = await capture({ frameId: id });
    const screenshot = await image({ frameId: id });
    const tree = await accessibility({ frameId: id });
    const destination = await link({ when: found.timestamp });
    assert.equal(found.frame_id, screenshot.frame_id);
    assert.equal(screenshot.image_path, "/tmp/synthetic-coast.png");
    assert.equal(tree.completeness, "unknown");
    assert.ok(JSON.stringify(destination).includes("coast://"));
    assert.equal(found.timestamp_utc, "2026-09-09T09:30:00.000Z");
    assert.ok(found.warnings.includes("Overlay detected"));
    assert.ok(calls.some((args) => args.includes("--show-ocr")));
  });
  it("retains filters during neighboring-moment navigation", async () => {
    const result = await adjacent({
      frameId: 10,
      direction: "next",
      appFilters: ["com.example"],
      domainFilters: ["example.com"],
    });
    assert.equal(result.capture?.frame_id, 11);
    const args = calls.at(-1)!;
    assert.ok(args.includes("--app-filter") && args.includes("com.example"));
    assert.ok(args.includes("--domain-filter") && args.includes("example.com"));
  });
  it("retains the full ordered highlight sequence and original range without a nearby cover query", async () => {
    const count = calls.length;
    const result = await loadTimeline("sample-today");
    assert.deepEqual(
      result.frames.map((item) => item.frame_id),
      [10, 12],
    );
    assert.match(result.scope.tr, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(calls.length, count + 1);
    assert.ok(calls.at(-1)!.includes("sample"));
    assert.ok(calls.at(-1)!.includes(result.scope.tr));
  });
  it("shapes surrounding moments, OCR boxes, and screen captures consistently without extra lookups", async () => {
    const around = await explore({ frameId: 10 });
    const evidence = around.groups[0].frames[0];
    assert.equal(evidence.timestamp_utc, "2026-09-09T09:30:00.000Z");
    assert.equal(evidence.ocr_truncated, false);
    assert.ok(evidence.warnings.includes("Overlay detected"));
    const count = calls.length;
    const positioned = await boxes({ frameId: 10, limit: 1 });
    const screen = await currentScreen({ includeOcr: true });
    for (const output of [positioned, screen]) {
      assert.equal(output.timestamp_utc, evidence.timestamp_utc);
      assert.equal(output.timestamp_basis, "explicit-offset");
      assert.ok(output.timezone && output.timestamp_local);
      assert.ok(output.warnings.includes("Overlay detected"));
    }
    assert.equal(positioned.truncated, true);
    assert.equal(positioned.returned_box_count, 1);
    assert.equal(positioned.total_box_count, 2);
    assert.equal(screen.ocr_truncated, true);
    assert.equal(screen.ocr_text + screen.ocr_text_tail, "x".repeat(10001));
    assert.equal(screen.ocr_payload_complete, true);
    assert.equal(calls.length, count + 2);
  });
  it("only matches explicit metadata and maintains stable frame ordering", () => {
    assert.equal(
      relatedReason(
        frame,
        { ...frame, frame_id: 11, url: frame.url + "#heading" },
        "url",
      ),
      "Same URL (fragment ignored)",
    );
    assert.equal(
      relatedReason(
        frame,
        { ...frame, frame_id: 11, url: "https://example.com/doc?a=2" },
        "url",
      ),
      undefined,
    );
    assert.equal(
      relatedReason(
        frame,
        { ...frame, frame_id: 11, application: "Other" },
        "title",
      ),
      undefined,
    );
    assert.deepEqual(
      orderedFrames([{ ...frame, frame_id: 11 }, frame, frame]).map(
        (item) => item.frame_id,
      ),
      [10, 11],
    );
  });
  it("stores only explicit search definitions, then resolves rolling filters on execution", async () => {
    await saveSearch({
      ...frame,
      id: "saved1",
      name: "Research",
      query: "Raycast",
      app: "com.example",
      domain: "example.com",
      days: "7",
    });
    const saved = (await listSavedSearches())[0];
    assert.equal("ocr_text" in saved, false);
    assert.equal("frame_id" in saved, false);
    const result = await runSavedSearch(saved);
    assert.equal(result.frames[0].frame_id, 10);
    assert.deepEqual(result.scope.appFilters, ["com.example"]);
  });
  it("continues saved results beyond 50 and preserves filters", async () => {
    searchFrames = Array.from({ length: 75 }, (_, index) => ({
      ...frame,
      frame_id: index + 1,
    }));
    try {
      const saved = (await listSavedSearches())[0];
      const first = await runSavedSearch(saved, { limit: 50 });
      const last = await runSavedSearch(saved, {
        limit: 50,
        offset: first.pagination.next_offset!,
      });
      assert.equal(first.frames.length, 50);
      assert.equal(last.frames.length, 25);
      assert.equal(last.frames[0].frame_id, 51);
      assert.equal(last.pagination.has_more, false);
      assert.deepEqual(first.scope, last.scope);
    } finally {
      searchFrames = undefined;
    }
  });
  it("reconstructs full OCR and accessibility text from explicit pages", async () => {
    const ocrPages: string[] = [];
    const treePages: string[] = [];
    let offset: number | undefined = 0;
    while (offset !== undefined) {
      const page = await capture({ frameId: 10, offset, maxCharacters: 3 });
      ocrPages.push(page.ocr_text);
      offset = page.next_character_offset;
    }
    offset = 0;
    while (offset !== undefined) {
      const page = await accessibility({
        frameId: 10,
        offset,
        maxCharacters: 3,
      });
      treePages.push(page.tree_text);
      assert.equal(page.completeness, "unknown");
      assert.equal(page.returned_bytes, Buffer.byteLength(page.tree_text));
      offset = page.next_character_offset;
    }
    assert.equal(ocrPages.join(""), frame.ocr_text);
    assert.equal(treePages.join(""), "AXButton Open");
  });
  it("surfaces CLI failures once without inventing a second native backend or retrying capture", async () => {
    const count = calls.length;
    fail = true;
    try {
      await assert.rejects(capture({ frameId: 10 }), /bridge unavailable/);
    } finally {
      fail = false;
    }
    assert.equal(calls.length, count + 1);
  });
});
