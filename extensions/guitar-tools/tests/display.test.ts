import test from "node:test";
import assert from "node:assert/strict";
import { centsToY, displayModel, renderTunerSVG, tunerMarkdown, type DisplayInput } from "../src/tuner-display";

const base: DisplayInput = {
  pitch: 110,
  db: -24,
  peak: 0.2,
  device: "iRig HD 2",
  state: "listening",
  dark: true,
};
const pitchAt = (cents: number) => 110 * 2 ** (cents / 1200);

test("vertical gauge puts sharp above and flat below the central target", () => {
  assert.equal(centsToY(0), 154);
  assert.equal(centsToY(50), 54);
  assert.equal(centsToY(-50), 254);
  assert.equal(centsToY(100), 54);
  assert.equal(centsToY(-100), 254);
  const sharp = displayModel({ ...base, pitch: pitchAt(20) });
  const flat = displayModel({ ...base, pitch: pitchAt(-20) });
  assert.equal(sharp.cursorY, 114);
  assert.match(sharp.status, /loosen/);
  assert.equal(flat.cursorY, 194);
  assert.match(flat.status, /tighten the string/);
});

test("green target matches the existing plus/minus three-cent tolerance", () => {
  for (const cents of [-3, 0, 3]) {
    assert.equal(displayModel({ ...base, pitch: pitchAt(cents) }).inTune, true);
  }
  for (const cents of [-4, 4]) {
    assert.equal(displayModel({ ...base, pitch: pitchAt(cents) }).inTune, false);
  }
  assert.match(renderTunerSVG(base), /id="pitch-cursor" data-cents="0"/);
});

test("no stale note or centered cursor is displayed while paused or warming", () => {
  for (const state of ["paused", "warming", "loading", "error"] as const) {
    const input = { ...base, state };
    assert.equal(displayModel(input).note, null);
    assert.equal(displayModel(input).cursorY, null);
    assert.doesNotMatch(renderTunerSVG(input), /id="pitch-cursor"/);
  }
  for (const pitch of [null, 0, NaN, Infinity]) {
    assert.equal(displayModel({ ...base, pitch }).note, null);
  }
});

test("quiet input and non-periodic signal are distinct from a detected note", () => {
  assert.match(displayModel({ ...base, pitch: null, db: -100 }).status, /Play an open string/);
  assert.match(displayModel({ ...base, pitch: null }).status, /Signal received/);
});

test("SVG escapes device names and supports both Raycast themes", () => {
  const svg = renderTunerSVG({
    ...base,
    device: 'Interface <USB> & "Guitare"',
  });
  assert.ok(svg.includes("Interface &lt;USB&gt; &amp; &quot;Guitare&quot;"));
  assert.ok(svg.includes("#f5f5f7"));
  assert.ok(renderTunerSVG({ ...base, dark: false }).includes("#17191d"));
  assert.match(renderTunerSVG({ ...base, peak: 1 }), /CLIPPING/);
});

test("markdown contains a sized, self-contained SVG without disk writes", () => {
  const markdown = tunerMarkdown(base);
  assert.match(markdown, /raycast-width=660&raycast-height=330/);
  const encoded = markdown.match(/base64,([^?]+)/)![1];
  assert.equal(Buffer.from(encoded, "base64").toString(), renderTunerSVG(base));
});
