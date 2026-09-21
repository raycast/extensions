/**
 * Parser for `brew vulns --json`.
 *
 * The fixture below is trimmed from real output captured on 2026-09-14
 * (Homebrew 7.0.1, 16 findings / 59 skipped). Two entries are SYNTHETIC and
 * marked as such: no formula on that machine carried a released version fix
 * (every `fixed_versions` entry was a 40-hex upstream commit SHA), and — unlike
 * what the plan assumed — no finding carried a non-empty `patched` array
 * either. Both shapes are serialized by brew, so both are exercised here.
 */

import { describe, expect, it } from "vitest";
import { ParseError } from "../errors";
import { parseBrewVulns, escapeMarkdown, osvLink, osvUrl, SEVERITY_RANK } from "./vulns";

const FIXTURE = JSON.stringify({
  findings: [
    {
      formula: "libheif",
      version: "1.23.1",
      tag: "v1.23.1",
      repo_url: "https://github.com/strukturag/libheif",
      vulnerabilities: [
        {
          id: "OSV-2020-2308",
          severity: "MEDIUM",
          summary: "Heap-buffer-overflow in derive_collocated_motion_vectors",
          aliases: [],
          fixed_versions: [],
        },
        {
          id: "OSV-2023-1129",
          severity: "MEDIUM",
          summary: "UNKNOWN READ in HeifPixelImage::overlay",
          aliases: [],
          fixed_versions: [],
        },
      ],
      patched: [],
    },
    {
      formula: "openjpeg",
      version: "2.5.4",
      tag: "v2.5.4",
      repo_url: "https://github.com/uclouvain/openjpeg",
      vulnerabilities: [
        // Deliberately listed UNKNOWN-first: the parser must sort `open` by
        // severity so the command's "Open in OSV" targets the worst advisory.
        {
          id: "CVE-2026-6192",
          severity: "UNKNOWN",
          summary: "uclouvain openjpeg pi.c opj_pi_initialise_encode integer overflow",
          aliases: [],
          fixed_versions: ["839936aa33eb8899bbbd80fda02796bb65068951"],
        },
        {
          id: "OSV-2025-219",
          severity: "HIGH",
          summary: "Heap-buffer-overflow in opj_j2k_read_tile_header",
          aliases: [],
          fixed_versions: ["d33cbecc148d3affcdf403211fddc2cc5d442379"],
        },
      ],
      patched: [],
    },
    {
      // SYNTHETIC `patched` entries — brew closes an advisory with a formula
      // patch, but nothing on the capture machine had one.
      formula: "libssh2",
      version: "1.11.1",
      tag: "1.11.1",
      repo_url: "https://github.com/libssh2/libssh2",
      vulnerabilities: [
        {
          id: "CVE-2026-55199",
          severity: "UNKNOWN",
          summary: "libssh2 - Pre-Authentication DoS via SSH_MSG_EXT_INFO Handler",
          aliases: [],
          fixed_versions: ["17626857d20b3c9a1addfa45979dadcee1cd84a4"],
        },
        {
          id: "CVE-2026-58050",
          severity: "UNKNOWN",
          summary: "libssh2 - Integer Overflow in publickey Subsystem Attribute Allocation",
          aliases: [],
          fixed_versions: [],
        },
        {
          id: "CVE-2026-66032",
          severity: "UNKNOWN",
          summary: "libssh2 Double-Free Heap Corruption via sftp_open()",
          aliases: [],
          fixed_versions: [],
        },
      ],
      patched: [
        {
          id: "CVE-2025-15661",
          severity: "UNKNOWN",
          summary: "libssh2 - Heap Buffer Over-read via sftp_symlink() in sftp.c",
          aliases: [],
          fixed_versions: ["2dae3024897e1898d389835151f4e9606227721d"],
        },
      ],
    },
    {
      formula: "tesseract",
      version: "5.5.3",
      tag: "5.5.3",
      repo_url: "https://github.com/tesseract-ocr/tesseract",
      vulnerabilities: [
        {
          id: "CVE-2026-88047",
          severity: "UNKNOWN",
          summary: "Tesseract: ReadNormProtos stack buffer overflow",
          aliases: ["GHSA-5j2p-r5vc-q7f3"],
          fixed_versions: ["1bda5079b1c8a7e25f523486837426903d29ce84"],
        },
        {
          // OSV's own `moderate` severity, plus the keys brew's serializer
          // leaves out when they are empty.
          id: "CVE-2026-88048",
          severity: "moderate",
        },
      ],
      patched: [],
    },
    {
      // SYNTHETIC: a released version fix. Nothing on the capture machine had
      // one — `brew vulns --json --fix-available` returned `findings: []`.
      formula: "synthetic-formula",
      version: "1.2.2",
      tag: "v1.2.2",
      repo_url: "https://github.com/example/synthetic",
      vulnerabilities: [
        {
          id: "CVE-2026-00001",
          severity: "critical",
          summary: "Synthetic advisory with a released fix",
          aliases: ["GHSA-xxxx-xxxx-xxxx"],
          fixed_versions: ["1.2.3"],
        },
      ],
      patched: [],
    },
    {
      // Patched-only: no open advisory, so this is not a finding the command
      // should ever show (mirrors brew's own `any_open?`).
      formula: "all-clear",
      version: "3.0.0",
      tag: "v3.0.0",
      repo_url: "https://github.com/example/all-clear",
      vulnerabilities: [],
      patched: [
        {
          id: "CVE-2026-00002",
          severity: "HIGH",
          summary: "Closed by a Homebrew patch",
          aliases: [],
          fixed_versions: [],
        },
      ],
    },
  ],
  skipped_formulae: ["lame", "libtiff", "libtool", "pv", "lzlib"],
});

describe("parseBrewVulns", () => {
  const results = parseBrewVulns(FIXTURE);

  it("keeps every finding with an open advisory and drops the patched-only one", () => {
    expect(results.findings.map((f) => f.formula)).not.toContain("all-clear");
    expect(results.findings).toHaveLength(5);
    expect(results.skipped).toEqual(["lame", "libtiff", "libtool", "pv", "lzlib"]);
  });

  it("preserves patched advisories on the finding that has them", () => {
    const libssh2 = results.findings.find((f) => f.formula === "libssh2");
    expect(libssh2?.patched.map((v) => v.id)).toEqual(["CVE-2025-15661"]);
    expect(libssh2?.open).toHaveLength(3);
  });

  it("carries the finding's own fields through", () => {
    const openjpeg = results.findings.find((f) => f.formula === "openjpeg");
    expect(openjpeg).toMatchObject({
      version: "2.5.4",
      tag: "v2.5.4",
      repoUrl: "https://github.com/uclouvain/openjpeg",
    });
  });

  it("copies fixed_versions verbatim, with no version/SHA classification", () => {
    const openjpeg = results.findings.find((f) => f.formula === "openjpeg");
    expect(openjpeg?.open.map((v) => v.fixedVersions)).toEqual([
      ["d33cbecc148d3affcdf403211fddc2cc5d442379"],
      ["839936aa33eb8899bbbd80fda02796bb65068951"],
    ]);
    const synthetic = results.findings.find((f) => f.formula === "synthetic-formula");
    expect(synthetic?.open[0].fixedVersions).toEqual(["1.2.3"]);
    // Missing key → empty array, not undefined.
    const tesseract = results.findings.find((f) => f.formula === "tesseract");
    expect(tesseract?.open.find((v) => v.id === "CVE-2026-88048")?.fixedVersions).toEqual([]);
  });

  it("defaults a missing summary and aliases", () => {
    const tesseract = results.findings.find((f) => f.formula === "tesseract");
    const vuln = tesseract?.open.find((v) => v.id === "CVE-2026-88048");
    expect(vuln?.summary).toBe("");
    expect(vuln?.aliases).toEqual([]);
    expect(tesseract?.open.find((v) => v.id === "CVE-2026-88047")?.aliases).toEqual(["GHSA-5j2p-r5vc-q7f3"]);
  });

  it("normalises severity, mapping brew's `moderate` onto MEDIUM", () => {
    const tesseract = results.findings.find((f) => f.formula === "tesseract");
    expect(tesseract?.open.find((v) => v.id === "CVE-2026-88048")?.severity).toBe("MEDIUM");
    const synthetic = results.findings.find((f) => f.formula === "synthetic-formula");
    expect(synthetic?.open[0].severity).toBe("CRITICAL");
  });

  it("falls back to UNKNOWN for a severity outside brew's vocabulary", () => {
    const parsed = parseBrewVulns(
      JSON.stringify({
        findings: [
          {
            formula: "weird",
            version: "1",
            tag: "1",
            repo_url: "https://example.com",
            vulnerabilities: [{ id: "X-1", severity: "bogus", summary: "", aliases: [], fixed_versions: [] }],
            patched: [],
          },
        ],
      }),
    );
    expect(parsed.findings[0].open[0].severity).toBe("UNKNOWN");
    expect(parsed.findings[0].severity).toBe("UNKNOWN");
  });

  it("rolls the highest open severity up to the finding", () => {
    const byFormula = Object.fromEntries(results.findings.map((f) => [f.formula, f.severity]));
    expect(byFormula).toEqual({
      "synthetic-formula": "CRITICAL",
      openjpeg: "HIGH",
      libheif: "MEDIUM",
      libssh2: "UNKNOWN",
      tesseract: "MEDIUM",
    });
  });

  it("sorts findings by severity, then advisory count, then name", () => {
    expect(results.findings.map((f) => f.formula)).toEqual([
      "synthetic-formula", // CRITICAL
      "openjpeg", // HIGH
      "libheif", // MEDIUM, 2 open
      "tesseract", // MEDIUM, 2 open, sorts after libheif by name
      "libssh2", // UNKNOWN
    ]);
  });

  it("sorts each finding's open advisories by severity, worst first", () => {
    const openjpeg = results.findings.find((f) => f.formula === "openjpeg");
    expect(openjpeg?.open.map((v) => v.id)).toEqual(["OSV-2025-219", "CVE-2026-6192"]);
  });

  it("returns an empty findings list, with skipped intact, when brew found nothing", () => {
    const parsed = parseBrewVulns(JSON.stringify({ findings: [], skipped_formulae: ["lame"] }));
    expect(parsed).toEqual({ findings: [], skipped: ["lame"] });
  });

  it("defaults skipped_formulae to an empty array when absent", () => {
    expect(parseBrewVulns(JSON.stringify({ findings: [] })).skipped).toEqual([]);
  });

  it.each([
    ["empty input", ""],
    ["the 6.0.11 bare-array shape", "[]"],
    ["an object with no findings", "{}"],
    ["not JSON at all", "Error: No available formula with the name"],
  ])("throws ParseError for %s", (_label, input) => {
    expect(() => parseBrewVulns(input)).toThrow(ParseError);
  });
});

describe("SEVERITY_RANK", () => {
  it("orders the five severities brew can report", () => {
    expect(SEVERITY_RANK.CRITICAL).toBeGreaterThan(SEVERITY_RANK.HIGH);
    expect(SEVERITY_RANK.HIGH).toBeGreaterThan(SEVERITY_RANK.MEDIUM);
    expect(SEVERITY_RANK.MEDIUM).toBeGreaterThan(SEVERITY_RANK.LOW);
    expect(SEVERITY_RANK.LOW).toBeGreaterThan(SEVERITY_RANK.UNKNOWN);
  });
});

describe("osvUrl", () => {
  it("builds the OSV advisory URL", () => {
    expect(osvUrl("CVE-2026-63073")).toBe("https://osv.dev/vulnerability/CVE-2026-63073");
  });
});

describe("escapeMarkdown", () => {
  it("renders an injected link as literal text", () => {
    const escaped = escapeMarkdown("[read this](https://attacker.invalid)");
    expect(escaped).toBe("\\[read this\\]\\(https://attacker.invalid\\)");
    expect(escaped).not.toMatch(/\[[^\\]*\]\(/);
  });

  it("escapes the inline formatting characters", () => {
    expect(escapeMarkdown("a * b _ c ` d ~ e | f # g")).toBe("a \\* b \\_ c \\` d \\~ e \\| f \\# g");
    expect(escapeMarkdown("<img src=x> and a back\\slash")).toBe("\\<img src=x\\> and a back\\\\slash");
  });

  it("collapses newlines so a summary cannot open a heading or a list", () => {
    expect(escapeMarkdown("first line\n\n# heading\r\n- item")).toBe("first line \\# heading - item");
  });

  it("leaves ordinary advisory prose alone", () => {
    expect(escapeMarkdown("Buffer overflow in the TLS handshake.")).toBe("Buffer overflow in the TLS handshake.");
  });
});

describe("osvLink", () => {
  it("links a well-formed advisory id", () => {
    expect(osvLink("GHSA-abc1-def2-ghi3")).toBe(
      "[GHSA-abc1-def2-ghi3](https://osv.dev/vulnerability/GHSA-abc1-def2-ghi3)",
    );
  });

  it("falls back to escaped plain text for an id that is not URL-safe", () => {
    expect(osvLink("CVE-1 ](javascript:alert(1))")).toBe("CVE-1 \\]\\(javascript:alert\\(1\\)\\)");
    expect(osvLink("")).toBe("");
  });
});
