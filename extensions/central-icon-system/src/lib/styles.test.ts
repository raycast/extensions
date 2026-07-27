import { describe, expect, it } from "vitest";
import { CORNERS, FILLS, STROKES, cornerKey, cornerLabel, styleId } from "../types";

/** Every style id the upstream scope actually publishes. */
function publishedStyles(): Set<string> {
  const ids = new Set<string>();
  for (const join of ["round", "square"] as const) {
    for (const fill of FILLS) {
      // Square ships radius-0 only — this asymmetry is the whole reason corner
      // is one axis rather than join × radius.
      for (const radius of join === "square" ? [0] : [0, 1, 2, 3]) {
        for (const stroke of STROKES) {
          ids.add(`${join}-${fill}-radius-${radius}-stroke-${stroke}`);
        }
      }
    }
  }
  return ids;
}

describe("style axes", () => {
  it("offers exactly the published styles — no more, no fewer", () => {
    // The bug this guards: separate Join and Corner menus offered 8 pairs for 5
    // real options, and `styleId` silently coerced the 3 impossible ones to
    // radius-0 while the menu still showed a different radius checked.
    const published = publishedStyles();
    const reachable = new Set<string>();

    for (const corner of CORNERS) {
      for (const fill of FILLS) {
        for (const stroke of STROKES) {
          reachable.add(styleId({ ...corner, fill, stroke }));
        }
      }
    }

    expect(reachable.size).toBe(published.size);
    for (const id of reachable) expect(published.has(id)).toBe(true);
    for (const id of published) expect(reachable.has(id)).toBe(true);
  });

  it("has five corner options, matching the site's control", () => {
    expect(CORNERS).toHaveLength(5);
    expect(CORNERS.map(cornerKey)).toEqual(["square-0", "round-0", "round-1", "round-2", "round-3"]);
  });

  it("labels corners the way the site does", () => {
    expect(CORNERS.map(cornerLabel)).toEqual(["0px Sharp", "0px Round", "1px Small", "2px Medium", "3px Large"]);
  });

  it("distinguishes sharp from round at radius 0", () => {
    // Both are "0px"; only the join separates them, which is why the label and
    // the key both have to carry it.
    expect(cornerKey({ join: "square", radius: 0 })).not.toBe(cornerKey({ join: "round", radius: 0 }));
    expect(cornerLabel({ join: "square", radius: 0 })).not.toBe(cornerLabel({ join: "round", radius: 0 }));
  });

  it("no longer clamps square to radius 0", () => {
    // The clamp existed to paper over impossible pairs. With corner as one axis
    // they can't be constructed, so styleId should be a pure formatter.
    expect(styleId({ join: "square", fill: "outlined", radius: 0, stroke: "1.5" })).toBe(
      "square-outlined-radius-0-stroke-1.5",
    );
  });
});
