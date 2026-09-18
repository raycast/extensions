import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { InstalledApp } from "../src/lib/apps";
import { formatAge } from "../src/lib/format";
import type { Usage } from "../src/lib/usage";
import { groupApps } from "../src/lib/views";

const DAY = 86_400_000;
const MB = 1024 ** 2;
const GB = 1024 ** 3;

function app(name: string): InstalledApp {
  return { path: `/Applications/${name}.app`, name, bundleId: `com.test.${name}`, aliases: [], fromAppStore: false };
}

const big = app("Big");
const medium = app("Medium");
const tiny = app("Tiny");
const apps = [big, medium, tiny];
const sizes = { [big.path]: 4 * GB, [medium.path]: 500 * MB, [tiny.path]: 2 * MB };

function ago(days: number): Usage {
  return { lastUsed: Date.now() - days * DAY, source: "activity" };
}

describe("groupApps by size", () => {
  it("bands by magnitude, largest first", () => {
    const buckets = groupApps("size", apps, sizes, {});
    assert.deepEqual(
      buckets.map((b) => [b.title, b.apps.map((a) => a.name)]),
      [
        ["1 GB and up", ["Big"]],
        ["100 MB – 1 GB", ["Medium"]],
        ["Under 10 MB", ["Tiny"]],
      ],
    );
  });

  it("omits empty bands", () => {
    assert.equal(groupApps("size", [tiny], sizes, {}).length, 1);
  });
});

describe("groupApps by last used", () => {
  it("leads with apps showing no sign of use", () => {
    const usage = { [big.path]: ago(400), [medium.path]: ago(5) };
    const buckets = groupApps("lastUsed", apps, sizes, usage);
    assert.equal(buckets[0].title, "No sign of ever being used");
    assert.deepEqual(buckets[0].apps.map((a) => a.name), ["Tiny"]);
  });

  it("bands by age, oldest first", () => {
    const usage = {
      [big.path]: ago(400),
      [medium.path]: ago(200),
      [tiny.path]: ago(2),
    };
    assert.deepEqual(
      groupApps("lastUsed", apps, sizes, usage).map((b) => b.title),
      ["Over a year ago", "6 – 12 months ago", "Within the last month"],
    );
  });
});

describe("groupApps with unusable timestamps", () => {
  it("does not crash on a date in the future", () => {
    // Clock skew or a file restored from an archive can date an app forwards.
    const usage = { [big.path]: { lastUsed: Date.now() + 5 * DAY, source: "spotlight" as const } };
    const buckets = groupApps("lastUsed", [big], sizes, usage);
    assert.equal(buckets.length, 1);
    assert.equal(buckets[0].title, "Within the last month");
  });

  it("reads a future date as used today rather than never", () => {
    const usage = { [big.path]: { lastUsed: Date.now() + 365 * DAY, source: "activity" as const } };
    const titles = groupApps("lastUsed", [big], sizes, usage).map((b) => b.title);
    assert.ok(!titles.includes("No sign of ever being used"));
  });

  it("survives a size that matches no band", () => {
    // Defensive: a negative size cannot occur today, but the view must not die
    // if a band table ever stops being exhaustive.
    assert.doesNotThrow(() => groupApps("size", [big], { [big.path]: -1 }, {}));
  });
});

describe("groupApps by name", () => {
  it("is a single flat list", () => {
    const buckets = groupApps("name", apps, sizes, {});
    assert.equal(buckets.length, 1);
    assert.equal(buckets[0].apps.length, 3);
  });
});

describe("formatAge", () => {
  it("never produces a zero-year phrase", () => {
    // 360 days is over 12 thirty-day months but under a 365-day year.
    for (let days = 1; days < 800; days++) {
      assert.doesNotMatch(formatAge(Date.now() - days * DAY), /\b0 (years|months|days)\b/);
    }
  });

  it("reads naturally", () => {
    assert.equal(formatAge(0), "unknown");
    assert.equal(formatAge(Date.now()), "today");
    assert.equal(formatAge(Date.now() - DAY), "yesterday");
    assert.equal(formatAge(Date.now() - 5 * DAY), "5 days ago");
    assert.equal(formatAge(Date.now() - 360 * DAY), "11 months ago");
    assert.equal(formatAge(Date.now() - 400 * DAY), "over a year ago");
    assert.equal(formatAge(Date.now() - 900 * DAY), "over 2 years ago");
  });
});
