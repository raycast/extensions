import assert from "node:assert/strict";
import test from "node:test";
import { Artifact } from "../src/types";
import { artifactInfographic, reportInfographic, reviewInfographic, summarizeSizes } from "../src/utils/infographics";

const now = Date.UTC(2026, 10, 12);
const artifact: Artifact = { path: "/demo/node_modules", size: 1024, activity: now, risk: "review", identity: [] };

function decode(markdown: string): string {
  const match = markdown.match(/base64,([^?]+)\?raycast-width=660/);
  assert.ok(match, "SVG should be embedded locally at the native detail width");
  const svg = Buffer.from(match[1], "base64").toString("utf8");
  assert.doesNotMatch(svg, /NaN|Infinity/);
  return svg;
}

test("storage share uses measured bytes and explicitly excludes unknown sizes", () => {
  const summary = summarizeSizes([artifact, { size: 3072 }, { size: null }]);
  assert.deepEqual(summary, { bytes: 4096, unknown: 1 });
  const svg = decode(artifactInfographic(artifact, summary, "complete", "dark", now));
  assert.match(svg, />25%</);
  assert.match(svg, /4 KB measured · 1 unknown/);
  assert.match(svg, /Measured scan results/);
});

test("unknown and zero sizes never become a fabricated percentage", () => {
  for (const size of [null, 0]) {
    const svg = decode(
      artifactInfographic({ ...artifact, size }, summarizeSizes([{ size }]), "complete", "light", now),
    );
    assert.doesNotMatch(svg, /stroke-dasharray/);
    assert.match(svg, size === null ? />Unknown</ : />0 B</);
  }
  const svg = decode(
    artifactInfographic({ ...artifact, size: 1 }, { bytes: 4096, unknown: 0 }, "complete", "dark", now),
  );
  assert.match(svg, /&lt;1%/);
});

test("incomplete results are labeled even when a known directory accounts for all measured bytes", () => {
  for (const status of ["preparing", "scanning", "failed", "canceled"] as const) {
    const svg = decode(artifactInfographic(artifact, { bytes: 1024, unknown: 0 }, status, "dark", now));
    assert.match(svg, /snapshot|Partial scan results/);
    assert.doesNotMatch(svg, /Measured scan results/);
  }
});

test("activity handles missing and future dates without placing them on the inactivity scale", () => {
  for (const activity of [null, now + 86_400_000]) {
    const svg = decode(
      artifactInfographic({ ...artifact, activity }, { bytes: 1024, unknown: 0 }, "complete", "light", now),
    );
    assert.match(svg, activity === null ? />Unknown</ : /Future date/);
    assert.doesNotMatch(svg, /cy="99"/);
  }
  const svg = decode(
    artifactInfographic(
      { ...artifact, activity: now - 400 * 86_400_000 },
      { bytes: 1024, unknown: 0 },
      "complete",
      "dark",
      now,
    ),
  );
  assert.match(svg, /400 days ago/);
  assert.match(svg, /cx="624" cy="99"/);
});

test("risk breakdown distinguishes unknown from review and sensitive", () => {
  for (const appearance of ["light", "dark"] as const) {
    const svg = decode(
      reviewInfographic(
        [artifact, { ...artifact, risk: "sensitive", size: null }, { ...artifact, risk: "unknown" }],
        appearance,
      ),
    );
    assert.match(svg, /2 KB estimated \+ 1 unknown/);
    for (const label of ["1 sensitive", "1 to review", "1 unknown risk"]) assert.ok(svg.includes(label));
    assert.doesNotMatch(svg, /safe to delete/i);
    decode(reviewInfographic([], appearance));
  }
});

test("report totals count only successful operations, retaining missing and failed outcomes", () => {
  const svg = decode(
    reportInfographic(
      [
        { path: "/a", status: "success", size: 1024 },
        { path: "/b", status: "success", size: null },
        { path: "/c", status: "missing", size: 4096 },
        { path: "/d", status: "failed", size: 8192 },
      ],
      "dark",
    ),
  );
  assert.match(svg, /1 KB \+ 1 unknown/);
  for (const label of ["2 succeeded", "1 already missing", "1 failed"]) assert.ok(svg.includes(label));
  assert.doesNotMatch(svg, /freed|reclaimed/i);
  decode(reportInfographic([], "light"));
});
