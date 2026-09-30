import { describe, expect, it } from "vitest";
import { projectDetail, projectResourceDiff, projectSummary } from "../../src/lib/argocd/project";
import { deriveAppSets, mergeAppSets, projectAppSet, rollupAppSet } from "../../src/lib/argocd/appset";

/**
 * Checks that the corpus served by scripts/demo-argocd.mjs still projects to fully painted rows.
 *
 * Store screenshots cannot come from a real instance: an application list is a list of service
 * names and the listing page is public. They come from that fake server instead, so a corpus
 * that quietly stopped projecting would put "unknown" in a published screenshot, and nobody
 * would notice until it was on the store.
 *
 * Skipped unless DEMO_ARGOCD points at a running one:
 *
 *   node scripts/demo-argocd.mjs &
 *   DEMO_ARGOCD=http://127.0.0.1:8080 npm test
 */

const base = process.env.DEMO_ARGOCD;
const when = base ? describe : describe.skip;

const get = async (path: string): Promise<unknown> => (await fetch(`${base}${path}`)).json();

when("the demo corpus projects to fully painted rows", () => {
  it("drops nothing and leaves no summary field empty", async () => {
    const list = (await get("/api/v1/applications")) as { items: unknown[] };
    const rows = list.items.map((app) => projectSummary(app, "demo"));
    expect(rows.filter((row) => row === undefined)).toHaveLength(0);

    const ok = rows.filter((row): row is NonNullable<typeof row> => row !== undefined);
    expect(ok).toHaveLength(list.items.length);

    for (const field of [
      "name",
      "namespace",
      "project",
      "health",
      "sync",
      "destinationName",
      "destinationNamespace",
      "repoUrl",
      "path",
      "targetRevision",
      "revision",
      "appSetName",
      "haystack",
    ] as const) {
      const empty = ok.filter((row) => row[field] === undefined || row[field] === "");
      expect({ field, empty: empty.length }).toEqual({ field, empty: 0 });
    }

    // A screenshot of one uniform status shows nothing about the extension.
    expect(new Set(ok.map((row) => row.health)).size).toBeGreaterThan(2);
    expect(new Set(ok.map((row) => row.sync))).toContain("OutOfSync");
  });

  it("counts generated applications on the path the view actually takes", async () => {
    // The earlier test only covered deriveAppSets. The ApplicationSets command renders
    // mergeAppSets(projectAppSet(from the API), derived), and a mismatch between the two
    // identities would show every rollup as "0 apps" while this file stayed green.
    const list = (await get("/api/v1/applications")) as { items: unknown[] };
    const rows = list.items
      .map((app) => projectSummary(app, "demo"))
      .filter((row): row is NonNullable<typeof row> => row !== undefined);

    const raw = (await get("/api/v1/applicationsets")) as { items: unknown[] };
    const fromApi = raw.items
      .map((item) => projectAppSet(item, "demo"))
      .filter((set): set is NonNullable<typeof set> => set !== undefined);
    expect(fromApi.length).toBeGreaterThan(0);

    const merged = mergeAppSets(fromApi, deriveAppSets(rows));
    expect(merged.length).toBe(fromApi.length);

    for (const appSet of merged) {
      const rollup = rollupAppSet(rows, appSet);
      expect({ name: appSet.name, total: rollup.total > 0 }).toEqual({
        name: appSet.name,
        total: true,
      });
    }
    expect(merged.some((set) => rollupAppSet(rows, set).outOfSync > 0)).toBe(true);
    expect(merged.some((set) => rollupAppSet(rows, set).degraded > 0)).toBe(true);
  });

  it("recovers every ApplicationSet from ownerReferences", async () => {
    const list = (await get("/api/v1/applications")) as { items: unknown[] };
    const rows = list.items
      .map((app) => projectSummary(app, "demo"))
      .filter((row): row is NonNullable<typeof row> => row !== undefined);

    const sets = deriveAppSets(rows);
    expect(sets.length).toBeGreaterThan(0);
    for (const appSet of sets) {
      expect(rollupAppSet(rows, appSet).total).toBeGreaterThan(0);
    }
  });

  it("paints a detail view with resources, history and a real diff", async () => {
    const name = "checkout-api-eu-west-prod";
    const detail = projectDetail(await get(`/api/v1/applications/${name}`), "demo");
    expect(detail).toBeDefined();
    expect(detail?.resources.length).toBeGreaterThan(0);
    expect(detail?.history.length).toBeGreaterThan(0);
    expect(detail?.syncResources.length).toBeGreaterThan(0);
    expect(detail?.summaryImages.length).toBeGreaterThan(0);

    const managed = (await get(`/api/v1/applications/${name}/managed-resources`)) as {
      items: unknown[];
    };
    const diffs = managed.items.map((item) => projectResourceDiff(item));
    expect(diffs.filter((diff) => diff === undefined)).toHaveLength(0);

    // The diff is computed locally from liveState and targetState, since ArgoCD leaves the
    // diff field empty. A screenshot of the diff view needs it to be non-trivial.
    const first = diffs[0];
    expect(first?.modified).toBe(true);
    expect(first?.tooLarge).toBe(false);
    expect(first?.added).toBeGreaterThan(0);
    expect(first?.removed).toBeGreaterThan(0);
    expect(first?.diff).toMatch(/replicas/);
    expect(first?.diff).toMatch(/^[-+]/m);
  });
});
