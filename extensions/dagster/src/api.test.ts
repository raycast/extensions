import { describe, it, expect, beforeAll } from "vitest";

import {
  fetchAssets,
  fetchAssetGraph,
  fetchAssetMaterializations,
  fetchRuns,
  fetchRunAssets,
  fetchRunErrors,
  fetchJobs,
  dagsterRunUrl,
  dagsterJobUrl,
  type AssetGraphNode,
} from "./api";
import { buildGraphIndex, resolveAssetSelection, groupByJob, assetKeyStr } from "./helpers";

beforeAll(() => {
  if (!process.env.SB_DAGSTER_URL) {
    throw new Error("SB_DAGSTER_URL not set — source .envrc first");
  }
});

describe("fetchAssets", () => {
  it("returns a non-empty list of assets", async () => {
    const assets = await fetchAssets();
    expect(assets.length).toBeGreaterThan(0);
    expect(assets[0].key.path).toBeInstanceOf(Array);
    expect(assets[0].key.path.length).toBeGreaterThan(0);
  });

  it("each asset has a key.path of strings", async () => {
    const assets = await fetchAssets();
    for (const asset of assets.slice(0, 5)) {
      for (const p of asset.key.path) {
        expect(typeof p).toBe("string");
      }
    }
  });
});

describe("fetchAssetMaterializations", () => {
  let assetPath: string[];

  beforeAll(async () => {
    const assets = await fetchAssets();
    // pick first asset that has at least one materialization
    const withMat = assets.find((a) => a.assetMaterializations.length > 0);
    expect(withMat).toBeDefined();
    assetPath = withMat!.key.path;
  });

  it("returns materializations for a known asset", async () => {
    const mats = await fetchAssetMaterializations(assetPath);
    expect(mats.length).toBeGreaterThan(0);
  });

  it("each materialization has expected fields", async () => {
    const mats = await fetchAssetMaterializations(assetPath);
    const m = mats[0];
    expect(m.runId).toBeTruthy();
    expect(typeof m.timestamp).toBe("string");
    expect(m.stepStats).toBeDefined();
    expect(typeof m.stepStats.startTime).toBe("number");
    expect(typeof m.stepStats.endTime).toBe("number");
    expect(m.metadataEntries).toBeInstanceOf(Array);
  });

  it("metadata entries include string types", async () => {
    const mats = await fetchAssetMaterializations(assetPath);
    const allTypes = new Set(mats.flatMap((m) => m.metadataEntries.map((e) => e.__typename)));
    // At least one type should be present
    expect(allTypes.size).toBeGreaterThan(0);
    // Verify string-type fields are returned when present
    for (const m of mats) {
      for (const e of m.metadataEntries) {
        if (e.__typename === "TextMetadataEntry") expect(typeof e.text).toBe("string");
        if (e.__typename === "PathMetadataEntry") expect(typeof e.path).toBe("string");
        if (e.__typename === "UrlMetadataEntry") expect(typeof e.url).toBe("string");
        if (e.__typename === "BoolMetadataEntry") expect(typeof e.boolValue).toBe("boolean");
      }
    }
  });

  it("returns empty array for a nonexistent asset", async () => {
    const mats = await fetchAssetMaterializations(["nonexistent_asset_xyz_12345"]);
    expect(mats).toEqual([]);
  });
});

describe("fetchRuns", () => {
  it("returns a non-empty list of runs", async () => {
    const runs = await fetchRuns();
    expect(runs.length).toBeGreaterThan(0);
  });

  it("each run has expected fields", async () => {
    const runs = await fetchRuns();
    const r = runs[0];
    expect(r.id).toBeTruthy();
    expect(r.status).toBeTruthy();
    expect(r.jobName).toBeTruthy();
    expect(typeof r.startTime === "number" || r.startTime === null).toBe(true);
  });

  it("filters out dunder jobs from runs", async () => {
    const runs = await fetchRuns();
    for (const r of runs) {
      expect(r.jobName.startsWith("__")).toBe(false);
    }
  });
});

describe("fetchRunAssets", () => {
  let runId: string;

  beforeAll(async () => {
    const runs = await fetchRuns();
    // pick first completed run (most likely to have materializations)
    const completed = runs.find((r) => r.status === "SUCCESS");
    expect(completed).toBeDefined();
    runId = completed!.id;
  });

  it("returns assets for a successful run", async () => {
    const assets = await fetchRunAssets(runId);
    expect(assets).toBeInstanceOf(Array);
    // a successful run should have produced at least one asset
    expect(assets.length).toBeGreaterThan(0);
  });

  it("each run asset has expected shape", async () => {
    const assets = await fetchRunAssets(runId);
    const a = assets[0];
    expect(a.assetKey).toBeInstanceOf(Array);
    expect(a.assetKey.length).toBeGreaterThan(0);
    expect(typeof a.stepKey).toBe("string");
    expect(typeof a.timestamp).toBe("string");
  });
});

describe("fetchJobs", () => {
  it("returns a non-empty list of jobs", async () => {
    const jobs = await fetchJobs();
    expect(jobs.length).toBeGreaterThan(0);
  });

  it("filters out dunder jobs", async () => {
    const jobs = await fetchJobs();
    for (const job of jobs) {
      expect(job.name.startsWith("__")).toBe(false);
    }
  });

  it("each job has location and repository info", async () => {
    const jobs = await fetchJobs();
    const j = jobs[0];
    expect(j.name).toBeTruthy();
    expect(j.locationName).toBeTruthy();
    expect(j.repositoryName).toBeTruthy();
    expect(j.schedules).toBeInstanceOf(Array);
    expect(j.runs).toBeInstanceOf(Array);
  });
});

describe("fetchAssetGraph", () => {
  it("returns a non-empty list of asset graph nodes", async () => {
    const nodes = await fetchAssetGraph();
    expect(nodes.length).toBeGreaterThan(0);
  });

  it("each node has graph metadata fields", async () => {
    const nodes = await fetchAssetGraph();
    const n = nodes[0];
    expect(n.assetKey.path).toBeInstanceOf(Array);
    expect(typeof n.isMaterializable).toBe("boolean");
    expect(typeof n.isPartitioned).toBe("boolean");
    expect(n.dependencyKeys).toBeInstanceOf(Array);
    expect(n.dependedByKeys).toBeInstanceOf(Array);
    expect(n.jobNames).toBeInstanceOf(Array);
    expect(n.jobs).toBeInstanceOf(Array);
  });

  it("each node has a groupName", async () => {
    const nodes = await fetchAssetGraph();
    for (const n of nodes.slice(0, 5)) {
      expect(typeof n.groupName === "string" || n.groupName === null).toBe(true);
    }
  });

  it("materializable assets have at least one job", async () => {
    const nodes = await fetchAssetGraph();
    const materializable = nodes.filter((n) => n.isMaterializable);
    for (const n of materializable.slice(0, 5)) {
      expect(n.jobs.length).toBeGreaterThan(0);
      expect(n.jobs[0].repository.name).toBeTruthy();
      expect(n.jobs[0].repository.location.name).toBeTruthy();
    }
  });
});

describe("resolveAssetSelection", () => {
  let graphIndex: Map<string, AssetGraphNode>;
  let nodes: AssetGraphNode[];

  beforeAll(async () => {
    nodes = await fetchAssetGraph();
    graphIndex = buildGraphIndex(nodes);
  });

  it("scope 'this' returns only the target asset", () => {
    const target = nodes.find((n) => n.isMaterializable && !n.isPartitioned);
    expect(target).toBeDefined();
    const selected = resolveAssetSelection(target!.assetKey.path, "this", graphIndex);
    expect(selected.length).toBe(1);
    expect(selected[0].assetKey.path).toEqual(target!.assetKey.path);
  });

  it("scope 'downstream' includes the target plus dependants", () => {
    const withDeps = nodes.find((n) => n.isMaterializable && !n.isPartitioned && n.dependedByKeys.length > 0);
    if (!withDeps) return; // skip if no asset has downstream
    const selected = resolveAssetSelection(withDeps.assetKey.path, "downstream", graphIndex);
    expect(selected.length).toBeGreaterThan(1);
    const keys = new Set(selected.map((n) => assetKeyStr(n.assetKey.path)));
    expect(keys.has(assetKeyStr(withDeps.assetKey.path))).toBe(true);
  });

  it("scope 'upstream' includes the target plus dependencies", () => {
    const withDeps = nodes.find((n) => n.isMaterializable && !n.isPartitioned && n.dependencyKeys.length > 0);
    if (!withDeps) return; // skip if no asset has upstream
    const selected = resolveAssetSelection(withDeps.assetKey.path, "upstream", graphIndex);
    expect(selected.length).toBeGreaterThan(1);
    const keys = new Set(selected.map((n) => assetKeyStr(n.assetKey.path)));
    expect(keys.has(assetKeyStr(withDeps.assetKey.path))).toBe(true);
  });

  it("scope 'upstream+downstream' includes both directions", () => {
    const withBoth = nodes.find(
      (n) => n.isMaterializable && !n.isPartitioned && n.dependencyKeys.length > 0 && n.dependedByKeys.length > 0,
    );
    if (!withBoth) return; // skip if no asset has both
    const selected = resolveAssetSelection(withBoth.assetKey.path, "upstream+downstream", graphIndex);
    const upOnly = resolveAssetSelection(withBoth.assetKey.path, "upstream", graphIndex);
    const downOnly = resolveAssetSelection(withBoth.assetKey.path, "downstream", graphIndex);
    expect(selected.length).toBeGreaterThanOrEqual(Math.max(upOnly.length, downOnly.length));
  });
});

describe("groupByJob", () => {
  it("groups materializable assets by their job", async () => {
    const nodes = await fetchAssetGraph();
    const materializable = nodes.filter((n) => n.isMaterializable && !n.isPartitioned && n.jobs.length > 0);
    const groups = groupByJob(materializable.slice(0, 10));
    expect(groups.length).toBeGreaterThan(0);
    for (const g of groups) {
      expect(g.jobName).toBeTruthy();
      expect(g.repositoryName).toBeTruthy();
      expect(g.locationName).toBeTruthy();
      expect(g.assetKeys.length).toBeGreaterThan(0);
    }
  });
});

describe("fetchRunErrors", () => {
  it("returns an array for a successful run (likely empty)", async () => {
    const runs = await fetchRuns();
    const success = runs.find((r) => r.status === "SUCCESS");
    expect(success).toBeDefined();
    const errors = await fetchRunErrors(success!.id);
    expect(errors).toBeInstanceOf(Array);
    expect(errors.length).toBe(0);
  });

  it("returns error events for a failed run", async () => {
    const runs = await fetchRuns();
    const failed = runs.find((r) => r.status === "FAILURE");
    if (!failed) return; // skip if no failed runs exist
    const errors = await fetchRunErrors(failed.id);
    expect(errors.length).toBeGreaterThan(0);
    const e = errors[0];
    expect(e.__typename).toBeTruthy();
    expect(typeof e.message).toBe("string");
    expect(typeof e.timestamp).toBe("string");
  });

  it("error events have error details when present", async () => {
    const runs = await fetchRuns();
    const failed = runs.find((r) => r.status === "FAILURE");
    if (!failed) return;
    const errors = await fetchRunErrors(failed.id);
    const withError = errors.find((e) => e.error !== null);
    if (!withError) return;
    expect(typeof withError.error!.message).toBe("string");
    expect(withError.error!.stack).toBeInstanceOf(Array);
  });

  it("only returns known error event types", async () => {
    const runs = await fetchRuns();
    const failed = runs.find((r) => r.status === "FAILURE");
    if (!failed) return;
    const errors = await fetchRunErrors(failed.id);
    const validTypes = new Set(["ExecutionStepFailureEvent", "RunFailureEvent"]);
    for (const e of errors) {
      expect(validTypes.has(e.__typename)).toBe(true);
    }
  });
});

describe("URL helpers", () => {
  it("dagsterRunUrl builds correct URL", () => {
    const url = dagsterRunUrl("abc-123");
    expect(url).toBe(`${process.env.SB_DAGSTER_URL}/runs/abc-123`);
  });

  it("dagsterRunUrl strips trailing slash", () => {
    const url = dagsterRunUrl("abc-123");
    expect(url).not.toContain("//runs");
  });

  it("dagsterJobUrl builds correct URL with encoding", () => {
    const url = dagsterJobUrl("my-location", "my-job");
    expect(url).toBe(`${process.env.SB_DAGSTER_URL}/locations/my-location/jobs/my-job`);
  });
});
