/**
 * Validates the projection and the ranking against a real instance's applications, which no
 * hand-written fixture can stand in for: what matters is that nothing in a corpus of a few
 * thousand real applications gets dropped, and that ranking that corpus stays imperceptible.
 *
 * Skipped unless REAL_APPS_JSON points at an ApplicationList. Produce one with:
 *
 *   kubectl --context <argocd cluster> get applications.argoproj.io -A -o json > /tmp/apps.json
 *   REAL_APPS_JSON=/tmp/apps.json npm test
 *
 * Never commit that file: it carries cluster, project and repository names.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { deriveAppSets } from "../../src/lib/argocd/appset";
import { projectSummary } from "../../src/lib/argocd/project";
import type { AppSummary } from "../../src/lib/argocd/types";
import { defaultOrder, rankApps } from "../../src/lib/search/score";

const RAW = process.env.REAL_APPS_JSON;

/**
 * Read lazily inside each test, never at collection time: describe.runIf still evaluates the
 * suite body, so reading the file up here throws when the variable is unset, which is the
 * normal case.
 */
function projectAll(): AppSummary[] {
  const list = JSON.parse(readFileSync(RAW as string, "utf8")) as { items: unknown[] };
  return list.items
    .map((item) => projectSummary(item, "i1"))
    .filter((app): app is AppSummary => app !== undefined);
}

function itemCount(): number {
  return (JSON.parse(readFileSync(RAW as string, "utf8")) as { items: unknown[] }).items.length;
}

describe.runIf(RAW)("projection against a real instance", () => {
  it("projects every application without dropping one", () => {
    const items = itemCount();
    const dropped = items - projectAll().length;
    console.log(`items ${items}, dropped ${dropped}`);
    expect(dropped).toBe(0);
  });

  it("populates the fields the list renders and searches on", () => {
    const apps = projectAll();
    const stats = {
      withAppSet: apps.filter((app) => app.appSetName).length,
      withRepo: apps.filter((app) => app.repoUrl).length,
      withDestinationNamespace: apps.filter((app) => app.destinationNamespace).length,
      unknownHealth: apps.filter((app) => app.health === "Unknown").length,
      unknownSync: apps.filter((app) => app.sync === "Unknown").length,
      emptyHaystack: apps.filter((app) => app.haystack.length === 0).length,
      projectionBytes: Buffer.byteLength(JSON.stringify(apps)),
    };
    console.log(stats);

    // Every row must be searchable, or it is invisible in a list that filters itself.
    expect(stats.emptyHaystack).toBe(0);
    expect(stats.unknownHealth).toBeLessThan(apps.length * 0.1);
    expect(stats.unknownSync).toBeLessThan(apps.length * 0.1);
  });

  it("reconstructs the ApplicationSets from the applications that carry an owner", () => {
    const apps = projectAll();
    const derived = deriveAppSets(apps);
    console.log(`derived ${derived.length} ApplicationSets from ${apps.length} applications`);
    // This is the fallback the ApplicationSets command relies on when the API returns an empty
    // list, so it has to actually produce something on a real corpus.
    expect(derived.length).toBeGreaterThan(0);
    expect(derived.every((set) => set.haystack.length > 0)).toBe(true);
  });

  it("ranks and orders the real corpus fast enough to run on every keystroke", () => {
    const apps = projectAll();

    for (const query of ["a", "prom", "argo cd", "zzzz-nothing"]) {
      const started = performance.now();
      const result = rankApps(apps, query, { limit: 60 });
      const ms = performance.now() - started;
      console.log(`rank "${query}": ${result.total} matches in ${ms.toFixed(1)} ms`);
      // A keystroke has about 16 ms before it is felt. The worst case is a query that matches
      // everything, which is exactly what a single-letter query does.
      expect(ms).toBeLessThan(60);
    }

    const started = performance.now();
    defaultOrder(apps, [], 60);
    const ms = performance.now() - started;
    console.log(`defaultOrder: ${ms.toFixed(1)} ms`);
    expect(ms).toBeLessThan(120);
  });
});
