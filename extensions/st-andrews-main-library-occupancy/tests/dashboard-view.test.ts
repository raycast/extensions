import assert from "node:assert/strict";
import { test } from "node:test";
import { dashboardGraphic } from "../src/dashboard-view";

function svg(image: string) {
  const encoded = /base64,([^"]+)/.exec(image)?.[1];
  assert.ok(encoded);
  return Buffer.from(encoded, "base64").toString();
}

test("the occupancy skeleton preserves bar dimensions and gives way to a valid zero", () => {
  const pending = dashboardGraphic("—", "— / — people", undefined, [], [], false, true);
  const loaded = dashboardGraphic("0%", "0 / 1,500 people", 0, [], [], false, true);
  assert.match(pending, /alt="📚 LIBRARY OCCUPANCY\. Loading occupancy/);
  assert.match(svg(pending), /class="skeleton" x="0" y="50" width="720" height="18"/);
  assert.match(svg(pending), /fill="#e5e6ed" opacity="0\.12"/);
  assert.doesNotMatch(svg(pending), /Gradient|<animate|sweep/);
  assert.match(loaded, /alt="📚 LIBRARY OCCUPANCY\. 0% occupancy/);
  assert.match(svg(loaded), /y="50" width="720" height="18"/);
  assert.doesNotMatch(svg(loaded), /animateTransform/);
});

test("both columns use the same width and keep their values inside the gutter", () => {
  const metric = {
    label: "A room with a long name that must fit beside its availability bubble",
    value: "24 free / 40",
  };
  const output = svg(dashboardGraphic("0%", "0 / 1,500 people", 0, [metric, metric], [metric, metric], false, true));
  const positions = [...output.matchAll(/<rect x="(\d+)" y="[\d.]+" width="(\d+)" height="26" rx="7"/g)];
  const [left, nextLeft, right, nextRight] = positions.map(([, x, width]) => Number(x) + Number(width));
  const [, rightX, headingY] = /<text x="(\d+)" y="(\d+)"[^>]*>AVAILABLE COMPUTERS/.exec(output) ?? [];
  const rightStart = Number(rightX);
  assert.equal(left, right - rightStart);
  assert.equal(rightStart - left, 56);
  assert.match(output, /<rect x="359\.25" y="1" width="1\.5" height="81\.5"/);
  assert.deepEqual([nextLeft, nextRight], [left, right]);
  const baselines = [...output.matchAll(/<text x="\d+" y="([\d.]+)"[^>]*>A room/g)].map((match) => Number(match[1]));
  assert.deepEqual(baselines, [40.5, 74.5, 40.5, 74.5]);
  assert.equal(Number(headingY), 9);
  assert.equal(baselines[1] - baselines[0], 34);
  assert.match(output, /lengthAdjust="spacingAndGlyphs"/);
  assert.match(output, /clip-path="url\(#label-/);
  assert.match(output, /font-size="14" font-weight="500">24 free \/ 40/);
});

test("metrics show loaded values and room names alongside only the pending pills", () => {
  const metrics = [
    { label: "Students", value: "0", hue: 323 },
    { label: "Average Visit", hue: 265, loading: true },
    { label: "Busiest Hour", value: "—" },
  ];
  const rooms = Array.from({ length: 5 }, (_, index) => ({ label: `Room ${index + 1}`, value: "24 free / 40" }));
  const pendingRooms = dashboardGraphic("0%", "0 / 1,500 people", 0, metrics, undefined, false, true);
  const loadedRooms = dashboardGraphic("0%", "0 / 1,500 people", 0, metrics, rooms, false, true);
  assert.match(pendingRooms, /Loading computer availability/);
  assert.match(loadedRooms, /Students: 0; Average Visit: loading; Busiest Hour: —/);
  assert.match(loadedRooms, /Room 5: 24 free \/ 40/);
  assert.match(pendingRooms, /\. STATS\./);
  assert.match(svg(pendingRooms), /fill="hsl\(265, 84%, 53%\)" opacity="0\.12"/);
  assert.match(svg(pendingRooms), /fill="#e5e6ed" opacity="0\.12"/);
  assert.doesNotMatch(svg(pendingRooms), /Gradient|<animate|sweep/);
  assert.equal(svg(pendingRooms).match(/class="skeleton"/g)?.length, 11);
  assert.equal(svg(loadedRooms).match(/class="skeleton"/g)?.length, 1);
  assert.equal(svg(pendingRooms).match(/viewBox="[^"]+"/)?.[0], svg(loadedRooms).match(/viewBox="[^"]+"/)?.[0]);
});

test("one SVG controls the three divider gaps and keeps the title on the canvas", () => {
  const metric = { label: "Students", value: "0" };
  const output = svg(dashboardGraphic("0%", "0 / 1,500 people", 0, [metric], [metric], false, true));
  assert.match(output, /<text y="18"[^>]+><tspan x="0" dy="1"[^>]+>📚<\/tspan><tspan x="30" dy="-1">/);
  const [summaryY, metricsY] = [...output.matchAll(/translate\(0 ([\d.]+)\)/g)].map(([, y]) => Number(y));
  const [, dividerY, dividerHeight] = /<rect y="([\d.]+)" width="720" height="([\d.]+)" rx="0\.75"/.exec(output) ?? [];
  const divider = summaryY + Number(dividerY);
  const [, busyY] = /y="(\d+)" text-anchor="end"[^>]*>Busy/.exec(output) ?? [];
  const [, headingY] = /y="(\d+)"[^>]*>STATS/.exec(output) ?? [];
  const [, pillY] = /<rect x="\d+" y="([\d.]+)" width="32" height="26" rx="7"/.exec(output) ?? [];
  assert.deepEqual(
    [
      divider - (summaryY + Number(busyY) + 2.5),
      metricsY - (divider + Number(dividerHeight)),
      Number(pillY) - (Number(headingY) + 0.5),
    ],
    [13, 13, 13],
  );
});
