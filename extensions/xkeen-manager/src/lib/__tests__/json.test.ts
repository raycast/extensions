import { describe, expect, test } from "vitest";

import {
  countChangedLines,
  extractOutboundTags,
  isOutboundsPath,
  isRoutingPath,
  stripJsonComments,
  tryParseJson,
  validateXrayJson,
} from "../json";

describe("stripJsonComments", () => {
  test("removes line comments", () => {
    const input = '{\n  "a": 1 // trailing comment\n}';
    expect(stripJsonComments(input)).toBe('{\n  "a": 1 \n}');
  });

  test("removes block comments", () => {
    const input = '{\n  "a": /* inline */ 1\n}';
    expect(stripJsonComments(input)).toBe('{\n  "a":  1\n}');
  });

  test("does not strip // inside string literals", () => {
    const input = '{"url": "https://example.com"}';
    expect(stripJsonComments(input)).toBe(input);
  });

  test("preserves escaped quotes inside strings", () => {
    const input = '{"a": "he said \\"hi // not a comment\\""}';
    expect(stripJsonComments(input)).toBe(input);
  });

  test("preserves newlines after a line comment", () => {
    const input = '"a": 1, // comment\n"b": 2';
    const result = stripJsonComments(input);
    expect(result).toBe('"a": 1, \n"b": 2');
    expect(result.split("\n").length).toBe(input.split("\n").length);
  });
});

describe("tryParseJson", () => {
  test("parses valid JSON containing comments", () => {
    const result = tryParseJson('{\n  "a": 1, // comment\n  "b": 2\n}');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ a: 1, b: 2 });
    }
  });

  test("returns ok:false with an error message for invalid JSON", () => {
    const result = tryParseJson("{ this is not json ");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(typeof result.error).toBe("string");
      expect(result.error.length).toBeGreaterThan(0);
    }
  });
});

describe("isRoutingPath / isOutboundsPath", () => {
  test("isRoutingPath matches the canonical filename", () => {
    expect(isRoutingPath("/opt/etc/xray/configs/05_routing.json")).toBe(true);
  });

  test("isRoutingPath matches any path containing 'routing'", () => {
    expect(isRoutingPath("/some/routing-backup.json")).toBe(true);
  });

  test("isRoutingPath rejects unrelated paths", () => {
    expect(isRoutingPath("/opt/etc/xray/configs/04_outbounds.json")).toBe(false);
  });

  test("isOutboundsPath matches the canonical filename", () => {
    expect(isOutboundsPath("/opt/etc/xray/configs/04_outbounds.json")).toBe(true);
  });

  test("isOutboundsPath matches any path containing 'outbounds'", () => {
    expect(isOutboundsPath("/some/outbounds-backup.json")).toBe(true);
  });

  test("isOutboundsPath rejects unrelated paths", () => {
    expect(isOutboundsPath("/opt/etc/xray/configs/05_routing.json")).toBe(false);
  });
});

describe("validateXrayJson", () => {
  const routingPath = "/opt/etc/xray/configs/05_routing.json";
  const outboundsPath = "/opt/etc/xray/configs/04_outbounds.json";
  const unrelatedPath = "/opt/etc/xray/configs/03_dns.json";

  test("root must be an object", () => {
    expect(validateXrayJson(routingPath, null)).toEqual(["Root must be a JSON object"]);
    expect(validateXrayJson(routingPath, "string")).toEqual(["Root must be a JSON object"]);
  });

  test("routing path without a routing object reports both missing errors", () => {
    const errors = validateXrayJson(routingPath, {});
    expect(errors).toContain("Missing object: routing");
    expect(errors).toContain("routing.rules must be an array");
    expect(errors.length).toBe(2);
  });

  test("routing.rules not an array", () => {
    const errors = validateXrayJson(routingPath, { routing: { rules: "nope" } });
    expect(errors).toEqual(["routing.rules must be an array"]);
  });

  test("routing rules with arbitrary outboundTags produce no errors when no knownOutboundTags given", () => {
    // These hardcoded "direct" / "vless-reality" requirements were removed:
    // any outbound tag naming scheme is valid without tag-awareness.
    const errors = validateXrayJson(routingPath, {
      routing: { rules: [{ outboundTag: "other" }, { outboundTag: "some-custom-proxy" }] },
    });
    expect(errors).toEqual([]);
  });

  test("valid routing produces no errors", () => {
    const errors = validateXrayJson(routingPath, {
      routing: {
        rules: [{ outboundTag: "direct" }, { outboundTag: "vless-reality" }],
      },
    });
    expect(errors).toEqual([]);
  });

  test("empty rules array produces no errors", () => {
    const errors = validateXrayJson(routingPath, { routing: { rules: [] } });
    expect(errors).toEqual([]);
  });

  test("knownOutboundTags: reports an error for a rule referencing an unknown outboundTag", () => {
    const errors = validateXrayJson(
      routingPath,
      { routing: { rules: [{ outboundTag: "direct" }, { outboundTag: "totally-unknown" }] } },
      ["direct", "vless-reality"],
    );
    expect(errors).toEqual(['Unknown outboundTag "totally-unknown" (known: direct, vless-reality)']);
  });

  test("knownOutboundTags: no errors when every rule's outboundTag is known", () => {
    const errors = validateXrayJson(
      routingPath,
      { routing: { rules: [{ outboundTag: "direct" }, { outboundTag: "vless-reality" }] } },
      ["direct", "vless-reality"],
    );
    expect(errors).toEqual([]);
  });

  test("knownOutboundTags: de-duplicates repeated unknown tags into a single error", () => {
    const errors = validateXrayJson(
      routingPath,
      { routing: { rules: [{ outboundTag: "ghost" }, { outboundTag: "ghost" }] } },
      ["direct"],
    );
    expect(errors).toEqual(['Unknown outboundTag "ghost" (known: direct)']);
  });

  test("knownOutboundTags: rules without an outboundTag are ignored", () => {
    const errors = validateXrayJson(routingPath, { routing: { rules: [{ domain: ["domain:example.com"] }] } }, [
      "direct",
    ]);
    expect(errors).toEqual([]);
  });

  test("empty knownOutboundTags array behaves like undefined (no tag-awareness check)", () => {
    const errors = validateXrayJson(routingPath, { routing: { rules: [{ outboundTag: "anything" }] } }, []);
    expect(errors).toEqual([]);
  });

  test("outbounds not an array", () => {
    const errors = validateXrayJson(outboundsPath, { outbounds: "nope" });
    expect(errors).toEqual(["outbounds must be an array"]);
  });

  test("valid outbounds produces no errors", () => {
    const errors = validateXrayJson(outboundsPath, { outbounds: [] });
    expect(errors).toEqual([]);
  });

  test("unrelated path skips both routing and outbounds checks", () => {
    expect(validateXrayJson(unrelatedPath, {})).toEqual([]);
  });
});

describe("extractOutboundTags", () => {
  test("extracts tags from a valid outbounds array", () => {
    const text = JSON.stringify({
      outbounds: [{ tag: "vless-reality", protocol: "vless" }, { tag: "direct" }],
    });
    expect(extractOutboundTags(text)).toEqual(["vless-reality", "direct"]);
  });

  test("de-duplicates repeated tags, preserving first-seen order", () => {
    const text = JSON.stringify({
      outbounds: [{ tag: "direct" }, { tag: "vless-reality" }, { tag: "direct" }],
    });
    expect(extractOutboundTags(text)).toEqual(["direct", "vless-reality"]);
  });

  test("tolerates JSON with comments", () => {
    const text = '{\n  "outbounds": [\n    // proxy\n    { "tag": "vless-reality" }\n  ]\n}';
    expect(extractOutboundTags(text)).toEqual(["vless-reality"]);
  });

  test("returns [] when outbounds is not an array", () => {
    expect(extractOutboundTags(JSON.stringify({ outbounds: "nope" }))).toEqual([]);
  });

  test("returns [] when outbounds is missing entirely", () => {
    expect(extractOutboundTags(JSON.stringify({}))).toEqual([]);
  });

  test("returns [] for invalid JSON", () => {
    expect(extractOutboundTags("{ not json")).toEqual([]);
  });

  test("skips entries with a non-string or missing tag", () => {
    const text = JSON.stringify({ outbounds: [{ tag: 42 }, {}, { tag: "direct" }] });
    expect(extractOutboundTags(text)).toEqual(["direct"]);
  });
});

describe("countChangedLines", () => {
  test("equal texts have zero changed lines", () => {
    const text = "line1\nline2\nline3";
    expect(countChangedLines(text, text)).toBe(0);
  });

  test("counts added lines", () => {
    const oldText = "line1\nline2";
    const newText = "line1\nline2\nline3\nline4";
    expect(countChangedLines(oldText, newText)).toBe(2);
  });

  test("counts modified lines", () => {
    const oldText = "line1\nline2\nline3";
    const newText = "line1\nCHANGED\nline3";
    expect(countChangedLines(oldText, newText)).toBe(1);
  });
});
