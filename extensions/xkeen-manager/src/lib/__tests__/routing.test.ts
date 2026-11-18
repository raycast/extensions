import { describe, expect, test } from "vitest";

import { tryParseJson } from "../json";
import {
  createRaycastCategory,
  detectInboundTags,
  entryTypesForField,
  existingValuesInCategory,
  findMatchingBrace,
  findRaycastCategory,
  insertDomainsIntoCategory,
  normalizeDomainToken,
  normalizeGeoipToken,
  normalizeGeositeToken,
  normalizeKeywordToken,
  normalizerForEntryType,
  parseRoutingCategories,
  RoutingCategory,
  splitInputs,
} from "../routing";

// ---------------------------------------------------------------------------
// parseRoutingCategories
// ---------------------------------------------------------------------------

describe("parseRoutingCategories", () => {
  test("parses the single-line header format", () => {
    const text = `
// 1. Proxy (VPN) (proxy domain)
{
  "type": "field",
  "outboundTag": "vless-reality",
  "domain": [
    "domain:example.com"
  ]
}
`;
    const categories = parseRoutingCategories(text);
    expect(categories).toHaveLength(1);
    expect(categories[0].number).toBe(1);
    expect(categories[0].title).toBe("Proxy (VPN) (proxy domain)");
    expect(categories[0].outboundTag).toBe("vless-reality");
    expect(categories[0].field).toBe("domain");
  });

  test("parses the old triple-line header format", () => {
    const text = `
// ====
// 2. Direct (LAN)
// ====
{
  "type": "field",
  "outboundTag": "direct",
  "ip": [
    "192.168.1.0/24"
  ]
}
`;
    const categories = parseRoutingCategories(text);
    expect(categories).toHaveLength(1);
    expect(categories[0].number).toBe(2);
    expect(categories[0].title).toBe("Direct (LAN)");
    expect(categories[0].outboundTag).toBe("direct");
    expect(categories[0].field).toBe("ip");
  });

  test("extracts number, title and outboundTag across multiple categories", () => {
    const text = `
// 1. Proxy (VPN) (proxy domain)
{
  "outboundTag": "vless-reality",
  "domain": ["domain:example.com"]
},
// 2. Direct (LAN и российские сайты)
{
  "outboundTag": "direct",
  "domain": ["domain:ru-site.ru"]
}
`;
    const categories = parseRoutingCategories(text);
    expect(categories.map((c) => c.number)).toEqual([1, 2]);
    expect(categories.map((c) => c.title)).toEqual(["Proxy (VPN) (proxy domain)", "Direct (LAN и российские сайты)"]);
    expect(categories.map((c) => c.outboundTag)).toEqual(["vless-reality", "direct"]);
  });

  test("detects the ruleSet field", () => {
    const text = `
// 1. RuleSet category
{
  "outboundTag": "vless-reality",
  "ruleSet": ["geosite:google"]
}
`;
    const categories = parseRoutingCategories(text);
    expect(categories[0].field).toBe("ruleSet");
  });

  test("returns an empty array for empty text", () => {
    expect(parseRoutingCategories("")).toEqual([]);
  });

  test("returns an empty array when there are no headers", () => {
    expect(parseRoutingCategories('{ "outboundTag": "direct" }')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// createRaycastCategory regression coverage
// ---------------------------------------------------------------------------

describe("createRaycastCategory", () => {
  const withDirect = `{
  "routing": {
    "rules": [
      // 1. Proxy (VPN) (proxy domain)
      {
        "type": "field",
        "outboundTag": "vless-reality",
        "domain": [
          "domain:example.com"
        ]
      },
      // 2. Direct (LAN и российские сайты)
      {
        "type": "field",
        "outboundTag": "direct",
        "domain": [
          "domain:ru-site.ru"
        ]
      }
    ]
  }
}
`;

  const withoutDirect = `{
  "routing": {
    "rules": [
      // 1. Proxy (VPN) (proxy domain)
      {
        "type": "field",
        "outboundTag": "vless-reality",
        "domain": [
          "domain:example.com"
        ]
      }
    ]
  }
}
`;

  test("inserts before the direct category with a trailing comma, producing valid JSON", () => {
    const categories = parseRoutingCategories(withDirect);
    const result = createRaycastCategory(withDirect, categories);

    const parsed = tryParseJson(result);
    expect(parsed.ok).toBe(true);

    // The new block must be followed by a comma since another rule (direct) comes after it.
    const idx = result.indexOf('"domain": []');
    expect(idx).toBeGreaterThan(-1);
    const closeBraceIdx = result.indexOf("}", idx);
    expect(result[closeBraceIdx + 1]).toBe(",");

    if (parsed.ok) {
      const value = parsed.value as { routing: { rules: Array<Record<string, unknown>> } };
      expect(value.routing.rules).toHaveLength(3);
      const newRule = value.routing.rules.find((r) => Array.isArray(r.domain) && (r.domain as unknown[]).length === 0);
      expect(newRule).toBeTruthy();
      expect(newRule?.outboundTag).toBe("vless-reality");
    }
  });

  test("falls back to appending after the last rule when there is no direct category, producing valid JSON", () => {
    const categories = parseRoutingCategories(withoutDirect);
    const result = createRaycastCategory(withoutDirect, categories);

    const parsed = tryParseJson(result);
    expect(parsed.ok).toBe(true);

    // The new block is now the last element, so its closing brace must NOT be
    // followed by a trailing comma (that would produce invalid `},]` JSON).
    const idx = result.indexOf('"domain": []');
    expect(idx).toBeGreaterThan(-1);
    const closeBraceIdx = result.indexOf("}", idx);
    expect(result[closeBraceIdx + 1]).not.toBe(",");

    if (parsed.ok) {
      const value = parsed.value as { routing: { rules: Array<Record<string, unknown>> } };
      expect(value.routing.rules).toHaveLength(2);
    }
  });

  test("full cycle: create -> parse -> find -> insert yields valid JSON containing the new token", () => {
    const created = createRaycastCategory(withDirect, parseRoutingCategories(withDirect));
    const categoriesAfterCreate = parseRoutingCategories(created);

    const raycastCategory = findRaycastCategory(categoriesAfterCreate);
    expect(raycastCategory).not.toBeNull();

    const inserted = insertDomainsIntoCategory(created, raycastCategory as RoutingCategory, ["domain:newsite.example"]);

    const parsed = tryParseJson(inserted);
    expect(parsed.ok).toBe(true);
    expect(inserted).toContain("domain:newsite.example");

    if (parsed.ok) {
      const value = parsed.value as { routing: { rules: Array<Record<string, unknown>> } };
      const found = value.routing.rules.find(
        (r) => Array.isArray(r.domain) && (r.domain as unknown[]).includes("domain:newsite.example"),
      );
      expect(found).toBeTruthy();
    }
  });

  test("uses the default proxyTag and inboundTag when no options are given", () => {
    const result = createRaycastCategory(withoutDirect, parseRoutingCategories(withoutDirect));
    expect(result).toContain('"outboundTag": "vless-reality"');
    expect(result).toContain('"inboundTag": ["redirect", "tproxy", "mixed"]');
  });

  test("uses a custom proxyTag and inboundTags when provided, producing valid JSON", () => {
    const categories = parseRoutingCategories(withoutDirect);
    const result = createRaycastCategory(withoutDirect, categories, {
      proxyTag: "my-custom-outbound",
      inboundTags: ["mixed"],
    });

    expect(result).toContain('"outboundTag": "my-custom-outbound"');
    expect(result).toContain('"inboundTag": ["mixed"]');

    const parsed = tryParseJson(result);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      const value = parsed.value as { routing: { rules: Array<Record<string, unknown>> } };
      const newRule = value.routing.rules.find((r) => Array.isArray(r.domain) && (r.domain as unknown[]).length === 0);
      expect(newRule?.outboundTag).toBe("my-custom-outbound");
      expect(newRule?.inboundTag).toEqual(["mixed"]);
    }
  });

  test("custom proxyTag also works on the insert-before-direct path", () => {
    const categories = parseRoutingCategories(withDirect);
    const result = createRaycastCategory(withDirect, categories, { proxyTag: "other-proxy" });
    expect(tryParseJson(result).ok).toBe(true);
    expect(result).toContain('"outboundTag": "other-proxy"');
  });
});

// ---------------------------------------------------------------------------
// findRaycastCategory
// ---------------------------------------------------------------------------

describe("findRaycastCategory", () => {
  const base: Omit<RoutingCategory, "title"> = {
    index: 0,
    number: 1,
    outboundTag: "vless-reality",
    field: "domain",
    charStart: 0,
    charEnd: 10,
  };

  test("finds a category by 'raycast' in the title", () => {
    const categories: RoutingCategory[] = [{ ...base, title: "My Raycast Category" }];
    expect(findRaycastCategory(categories)?.title).toBe("My Raycast Category");
  });

  test("finds a category by 'Manual domains' in the title with Raycast", () => {
    const categories: RoutingCategory[] = [{ ...base, title: "Manual domains (Raycast, proxy domain)" }];
    expect(findRaycastCategory(categories)?.title).toBe("Manual domains (Raycast, proxy domain)");
  });

  test("returns null when no category matches", () => {
    const categories: RoutingCategory[] = [{ ...base, title: "Direct (LAN)" }];
    expect(findRaycastCategory(categories)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// insertDomainsIntoCategory
// ---------------------------------------------------------------------------

describe("insertDomainsIntoCategory", () => {
  function makeCategory(rawText: string): RoutingCategory {
    const braceIdx = rawText.indexOf("{");
    const closeIdx = findMatchingBrace(rawText, braceIdx);
    return {
      index: 0,
      number: 1,
      title: "Raycast",
      outboundTag: "vless-reality",
      field: "domain",
      charStart: braceIdx,
      charEnd: closeIdx,
    };
  }

  test("inserts into an empty array", () => {
    const rawText = '{\n  "outboundTag": "vless-reality",\n  "domain": []\n}';
    const category = makeCategory(rawText);
    const result = insertDomainsIntoCategory(rawText, category, ["domain:example.com"]);
    expect(result).toBe('{\n  "outboundTag": "vless-reality",\n  "domain": [\n      "domain:example.com"\n    ]\n}');
    expect(tryParseJson(result).ok).toBe(true);
  });

  test("expands a single-line array into a multi-line array", () => {
    const rawText = '{\n  "outboundTag": "vless-reality",\n  "domain": ["domain:a.com", "domain:b.com"]\n}';
    const category = makeCategory(rawText);
    const result = insertDomainsIntoCategory(rawText, category, ["domain:c.com"]);
    expect(result).toBe(
      '{\n  "outboundTag": "vless-reality",\n  "domain": [\n      "domain:a.com",\n      "domain:b.com",\n      "domain:c.com"\n    ]\n}',
    );
    expect(tryParseJson(result).ok).toBe(true);
  });

  test("appends into a multi-line array preserving detected indent", () => {
    const rawText = '{\n  "outboundTag": "vless-reality",\n  "domain": [\n    "domain:a.com"\n  ]\n}';
    const category = makeCategory(rawText);
    const result = insertDomainsIntoCategory(rawText, category, ["domain:b.com"]);
    expect(result).toBe(
      '{\n  "outboundTag": "vless-reality",\n  "domain": [\n    "domain:a.com",\n    "domain:b.com"\n  ]\n}',
    );
    expect(tryParseJson(result).ok).toBe(true);
  });

  test("inserts several values at once", () => {
    const rawText = '{\n  "outboundTag": "vless-reality",\n  "domain": [\n    "domain:a.com"\n  ]\n}';
    const category = makeCategory(rawText);
    const result = insertDomainsIntoCategory(rawText, category, ["domain:b.com", "domain:c.com"]);
    expect(result).toBe(
      '{\n  "outboundTag": "vless-reality",\n  "domain": [\n    "domain:a.com",\n    "domain:b.com",\n    "domain:c.com"\n  ]\n}',
    );
  });

  test("returns the text unchanged when values is empty", () => {
    const rawText = '{\n  "outboundTag": "vless-reality",\n  "domain": [\n    "domain:a.com"\n  ]\n}';
    const category = makeCategory(rawText);
    const result = insertDomainsIntoCategory(rawText, category, []);
    expect(result).toBe(rawText);
  });
});

// ---------------------------------------------------------------------------
// existingValuesInCategory
// ---------------------------------------------------------------------------

describe("existingValuesInCategory", () => {
  function makeCategory(rawText: string, field: RoutingCategory["field"] = "domain"): RoutingCategory {
    const braceIdx = rawText.indexOf("{");
    const closeIdx = findMatchingBrace(rawText, braceIdx);
    return {
      index: 0,
      number: 1,
      title: "Raycast",
      outboundTag: "vless-reality",
      field,
      charStart: braceIdx,
      charEnd: closeIdx,
    };
  }

  test("returns the values already present in a multi-line array", () => {
    const rawText =
      '{\n  "outboundTag": "vless-reality",\n  "domain": [\n    "domain:a.com",\n    "domain:b.com"\n  ]\n}';
    const category = makeCategory(rawText);
    expect(existingValuesInCategory(rawText, category)).toEqual(new Set(["domain:a.com", "domain:b.com"]));
  });

  test("returns the values already present in a single-line array", () => {
    const rawText = '{\n  "outboundTag": "vless-reality",\n  "domain": ["domain:a.com", "domain:b.com"]\n}';
    const category = makeCategory(rawText);
    expect(existingValuesInCategory(rawText, category)).toEqual(new Set(["domain:a.com", "domain:b.com"]));
  });

  test("returns an empty set for an empty array", () => {
    const rawText = '{\n  "outboundTag": "vless-reality",\n  "domain": []\n}';
    const category = makeCategory(rawText);
    expect(existingValuesInCategory(rawText, category)).toEqual(new Set());
  });

  test("returns an empty set when the field cannot be located", () => {
    const rawText = '{\n  "outboundTag": "vless-reality"\n}';
    const category = makeCategory(rawText);
    expect(existingValuesInCategory(rawText, category)).toEqual(new Set());
  });
});

// ---------------------------------------------------------------------------
// findMatchingBrace
// ---------------------------------------------------------------------------

describe("findMatchingBrace", () => {
  test("matches braces in nested objects", () => {
    const text = '{"a":{"b":1}}';
    expect(findMatchingBrace(text, 0)).toBe(text.length - 1);
  });

  test("ignores braces inside string literals", () => {
    const text = '{"a{b": 1}';
    expect(findMatchingBrace(text, 0)).toBe(text.length - 1);
  });

  test("ignores braces inside // line comments", () => {
    const text = '{\n  // { not real\n  "a": 1\n}';
    expect(findMatchingBrace(text, 0)).toBe(text.length - 1);
  });

  test("ignores braces inside block comments", () => {
    const text = '{ /* { still not real } */ "a": 1 }';
    expect(findMatchingBrace(text, 0)).toBe(text.length - 1);
  });

  test("returns -1 for unbalanced text", () => {
    const text = '{ "a": 1';
    expect(findMatchingBrace(text, 0)).toBe(-1);
  });

  test("returns -1 when start is out of range", () => {
    expect(findMatchingBrace("{}", -1)).toBe(-1);
    expect(findMatchingBrace("{}", 5)).toBe(-1);
  });
});

// ---------------------------------------------------------------------------
// detectInboundTags
// ---------------------------------------------------------------------------

describe("detectInboundTags", () => {
  test("finds a single-line inboundTag array", () => {
    const text = '{\n  "inboundTag": ["redirect", "tproxy", "mixed"],\n  "outboundTag": "direct"\n}';
    expect(detectInboundTags(text)).toEqual(["redirect", "tproxy", "mixed"]);
  });

  test("finds a multi-line inboundTag array", () => {
    const text = [
      "{",
      '  "inboundTag": [',
      '    "redirect",',
      '    "mixed"',
      "  ],",
      '  "outboundTag": "direct"',
      "}",
    ].join("\n");
    expect(detectInboundTags(text)).toEqual(["redirect", "mixed"]);
  });

  test("returns the first inboundTag array when multiple categories exist", () => {
    const text = `
// 1. Proxy
{
  "inboundTag": ["mixed"],
  "outboundTag": "vless-reality"
},
// 2. Direct
{
  "inboundTag": ["redirect", "tproxy"],
  "outboundTag": "direct"
}
`;
    expect(detectInboundTags(text)).toEqual(["mixed"]);
  });

  test("returns null when there is no inboundTag key", () => {
    expect(detectInboundTags('{\n  "outboundTag": "direct"\n}')).toBeNull();
  });

  test("returns null for an empty inboundTag array", () => {
    expect(detectInboundTags('{\n  "inboundTag": [],\n  "outboundTag": "direct"\n}')).toBeNull();
  });

  test("returns null for empty text", () => {
    expect(detectInboundTags("")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Token normalizers
// ---------------------------------------------------------------------------

describe("normalizeDomainToken", () => {
  test("wraps a bare domain", () => {
    expect(normalizeDomainToken("example.com")).toBe("domain:example.com");
  });

  test("extracts the hostname from a URL", () => {
    expect(normalizeDomainToken("https://x.com/path?query=1")).toBe("domain:x.com");
  });

  test("passes through already-prefixed tokens", () => {
    expect(normalizeDomainToken("domain:example.com")).toBe("domain:example.com");
    expect(normalizeDomainToken("keyword:foo")).toBe("keyword:foo");
    expect(normalizeDomainToken("ext:geosite_v2fly.dat:google")).toBe("ext:geosite_v2fly.dat:google");
  });

  test("returns null for an empty string", () => {
    expect(normalizeDomainToken("")).toBeNull();
    expect(normalizeDomainToken("   ")).toBeNull();
  });
});

describe("normalizeKeywordToken", () => {
  test("wraps a bare keyword", () => {
    expect(normalizeKeywordToken("youtube")).toBe("keyword:youtube");
  });

  test("passes through already-prefixed tokens", () => {
    expect(normalizeKeywordToken("domain:example.com")).toBe("domain:example.com");
  });

  test("returns null for an empty string", () => {
    expect(normalizeKeywordToken("")).toBeNull();
  });
});

describe("normalizeGeositeToken", () => {
  test("wraps a bare geosite name", () => {
    expect(normalizeGeositeToken("google")).toBe("ext:geosite_v2fly.dat:google");
  });

  test("passes through ext: prefixed tokens", () => {
    expect(normalizeGeositeToken("ext:geosite_v2fly.dat:google")).toBe("ext:geosite_v2fly.dat:google");
    expect(normalizeGeositeToken("ext:something-else")).toBe("ext:something-else");
  });

  test("returns null for an empty string", () => {
    expect(normalizeGeositeToken("")).toBeNull();
  });
});

describe("normalizeGeoipToken", () => {
  test("wraps a bare country code", () => {
    expect(normalizeGeoipToken("ru")).toBe("ext:geoip_v2fly.dat:ru");
  });

  test("converts a geoip: prefixed token", () => {
    expect(normalizeGeoipToken("geoip:ru")).toBe("ext:geoip_v2fly.dat:ru");
  });

  test("passes through already-prefixed tokens", () => {
    expect(normalizeGeoipToken("ext:geoip_v2fly.dat:ru")).toBe("ext:geoip_v2fly.dat:ru");
  });

  test("returns null for an empty string", () => {
    expect(normalizeGeoipToken("")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// splitInputs
// ---------------------------------------------------------------------------

describe("splitInputs", () => {
  test("splits on commas", () => {
    expect(splitInputs("a, b, c")).toEqual(["a", "b", "c"]);
  });

  test("splits on newlines", () => {
    expect(splitInputs("a\nb\nc")).toEqual(["a", "b", "c"]);
  });

  test("splits on CRLF newlines", () => {
    expect(splitInputs("a\r\nb\r\nc")).toEqual(["a", "b", "c"]);
  });

  test("filters out empty elements", () => {
    expect(splitInputs("a,,b,\n,c,")).toEqual(["a", "b", "c"]);
  });

  test("handles empty input", () => {
    expect(splitInputs("")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// entryTypesForField / normalizerForEntryType
// ---------------------------------------------------------------------------

describe("entryTypesForField", () => {
  test("ip field only supports geoip", () => {
    expect(entryTypesForField("ip")).toEqual(["geoip"]);
  });

  test("domain field supports domain, keyword and geosite", () => {
    expect(entryTypesForField("domain")).toEqual(["domain", "keyword", "geosite"]);
  });

  test("ruleSet field supports domain, keyword and geosite", () => {
    expect(entryTypesForField("ruleSet")).toEqual(["domain", "keyword", "geosite"]);
  });
});

describe("normalizerForEntryType", () => {
  test("maps each entry type to its normalizer function", () => {
    expect(normalizerForEntryType("domain")).toBe(normalizeDomainToken);
    expect(normalizerForEntryType("keyword")).toBe(normalizeKeywordToken);
    expect(normalizerForEntryType("geosite")).toBe(normalizeGeositeToken);
    expect(normalizerForEntryType("geoip")).toBe(normalizeGeoipToken);
  });
});
