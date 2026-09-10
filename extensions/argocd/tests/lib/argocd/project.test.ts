import { describe, expect, it } from "vitest";
import {
  MEASURED_LIST_APPLICATIONS,
  MEASURED_LIST_GZIP_BYTES,
  SUPPORTED_LIST_FILTERS,
} from "../../../src/lib/argocd/fields";
import {
  buildHaystack,
  countResources,
  projectDetail,
  projectHistory,
  projectResourceDiff,
  projectResources,
  projectRevisionMetadata,
  projectSummary,
  projectSyncPolicy,
  orderResources,
  resourceKey,
  resourceNeedsAttention,
} from "../../../src/lib/argocd/project";

const RAW_APP = {
  metadata: {
    name: "app-one",
    namespace: "team-a-apps",
    resourceVersion: "1234",
    ownerReferences: [
      { apiVersion: "argoproj.io/v1alpha1", kind: "ApplicationSet", name: "team-a-set", uid: "abc" },
    ],
  },
  spec: {
    project: "team-a",
    destination: { server: "https://kubernetes.default.svc", namespace: "team-a-runtime" },
    source: {
      repoURL: "https://github.example.com/team-a/manifests.git",
      path: "apps/app-one",
      targetRevision: "main",
    },
  },
  status: {
    sync: { status: "OutOfSync", revision: "0f1e2d3c4b5a" },
    health: { status: "Degraded" },
    operationState: { phase: "Failed", finishedAt: "2026-09-08T09:00:00Z" },
  },
};

describe("projectSummary", () => {
  it("fills every field of a single-source application", () => {
    const summary = projectSummary(RAW_APP, "i1");
    expect(summary).toMatchObject({
      instanceId: "i1",
      name: "app-one",
      namespace: "team-a-apps",
      project: "team-a",
      health: "Degraded",
      sync: "OutOfSync",
      phase: "Failed",
      finishedAt: "2026-09-08T09:00:00Z",
      destinationServer: "https://kubernetes.default.svc",
      destinationNamespace: "team-a-runtime",
      repoUrl: "https://github.example.com/team-a/manifests.git",
      path: "apps/app-one",
      targetRevision: "main",
      revision: "0f1e2d3c4b5a",
      appSetName: "team-a-set",
    });
  });

  it("builds a lowercased searchable haystack", () => {
    const summary = projectSummary(RAW_APP, "i1");
    expect(summary?.haystack).toContain("app-one");
    expect(summary?.haystack).toContain("team-a");
    expect(summary?.haystack).toContain("team-a-runtime");
    expect(summary?.haystack).toContain("team-a-set");
    expect(summary?.haystack).toBe(summary?.haystack.toLowerCase());
  });

  it("takes the first entry of a multi-source application", () => {
    const multi = {
      metadata: { name: "app-multi" },
      spec: {
        project: "team-a",
        sources: [
          { repoURL: "https://github.example.com/team-a/first.git", path: "first", targetRevision: "v1" },
          { repoURL: "https://github.example.com/team-a/second.git", path: "second" },
        ],
      },
    };
    expect(projectSummary(multi, "i1")).toMatchObject({
      repoUrl: "https://github.example.com/team-a/first.git",
      path: "first",
      targetRevision: "v1",
    });
  });

  it("treats an application with no status as unknown rather than dropping it", () => {
    const summary = projectSummary({ metadata: { name: "app-new" }, spec: { project: "team-a" } }, "i1");
    expect(summary).toMatchObject({ health: "Unknown", sync: "Unknown", phase: undefined });
  });

  it("defaults the namespace to argocd and the project to default", () => {
    const summary = projectSummary({ metadata: { name: "app-bare" } }, "i1");
    expect(summary).toMatchObject({ namespace: "argocd", project: "default" });
  });

  it("returns undefined for anything it cannot identify", () => {
    expect(projectSummary(null, "i1")).toBeUndefined();
    expect(projectSummary({}, "i1")).toBeUndefined();
    expect(projectSummary({ metadata: {} }, "i1")).toBeUndefined();
    expect(projectSummary({ metadata: { name: "" } }, "i1")).toBeUndefined();
    expect(projectSummary("app-one", "i1")).toBeUndefined();
    expect(projectSummary([], "i1")).toBeUndefined();
  });

  it("ignores owner references that are not an ApplicationSet", () => {
    const owned = {
      metadata: { name: "app-one", ownerReferences: [{ kind: "Application", name: "parent-app" }] },
    };
    expect(projectSummary(owned, "i1")?.appSetName).toBeUndefined();
  });

  it("leaves appSetName undefined when there is no owner reference", () => {
    expect(projectSummary({ metadata: { name: "app-one" } }, "i1")?.appSetName).toBeUndefined();
  });
});

describe("projectDetail", () => {
  const RAW_DETAIL = {
    ...RAW_APP,
    status: {
      ...RAW_APP.status,
      conditions: [
        { type: "SyncError", message: "one or more objects failed to apply" },
        { type: "", message: "dropped, no type" },
      ],
      summary: { images: ["registry.example.com/team-a/app-one:1.4.0"] },
      operationState: {
        phase: "Failed",
        message: "one or more objects failed to apply",
        startedAt: "2026-09-08T08:59:00Z",
        finishedAt: "2026-09-08T09:00:00Z",
        syncResult: {
          revision: "0f1e2d3c4b5a",
          resources: [
            {
              group: "apps",
              kind: "Deployment",
              namespace: "team-a-runtime",
              name: "app-one",
              status: "SyncFailed",
              message: "the server rejected the request",
              hookPhase: "Running",
            },
            { kind: "Service", name: "app-one" },
            { kind: "Service" },
          ],
        },
      },
      history: [
        { revision: "aaaaaaa", deployedAt: "2026-09-01T09:00:00Z" },
        { revision: "bbbbbbb", deployedAt: "2026-09-07T09:00:00Z" },
      ],
    },
  };

  it("keeps everything the summary carries", () => {
    expect(projectDetail(RAW_DETAIL, "i1")).toMatchObject({ name: "app-one", appSetName: "team-a-set" });
  });

  it("extracts the conditions, dropping entries with no type", () => {
    expect(projectDetail(RAW_DETAIL, "i1")?.conditions).toEqual([
      { type: "SyncError", message: "one or more objects failed to apply" },
    ]);
  });

  it("extracts the operation message and timestamps", () => {
    expect(projectDetail(RAW_DETAIL, "i1")).toMatchObject({
      operationMessage: "one or more objects failed to apply",
      operationStartedAt: "2026-09-08T08:59:00Z",
      summaryImages: ["registry.example.com/team-a/app-one:1.4.0"],
    });
  });

  it("reads the most recent history entry, which ArgoCD stores last", () => {
    expect(projectDetail(RAW_DETAIL, "i1")).toMatchObject({
      lastSyncRevision: "bbbbbbb",
      lastSyncDeployedAt: "2026-09-07T09:00:00Z",
    });
  });

  it("keeps sync result resources that have a name and drops the rest", () => {
    const resources = projectDetail(RAW_DETAIL, "i1")?.syncResources ?? [];
    expect(resources).toHaveLength(2);
    expect(resources[0]).toEqual({
      group: "apps",
      kind: "Deployment",
      namespace: "team-a-runtime",
      name: "app-one",
      status: "SyncFailed",
      message: "the server rejected the request",
      hookPhase: "Running",
    });
    expect(resources[1]).toMatchObject({ kind: "Service", name: "app-one", group: "", status: "" });
  });

  it("returns empty collections for an application that never synced", () => {
    expect(projectDetail({ metadata: { name: "app-new" } }, "i1")).toMatchObject({
      conditions: [],
      summaryImages: [],
      syncResources: [],
      lastSyncRevision: undefined,
      lastSyncDeployedAt: undefined,
      operationMessage: undefined,
    });
  });

  it("returns undefined for an unidentifiable application", () => {
    expect(projectDetail({}, "i1")).toBeUndefined();
  });
});

describe("buildHaystack", () => {
  it("drops undefined, lowercases and collapses whitespace", () => {
    expect(buildHaystack(["App-One", undefined, "  Team   A ", ""])).toBe("app-one team a");
  });

  it("is empty when there is nothing to index", () => {
    expect(buildHaystack([undefined, ""])).toBe("");
  });
});

describe("list filters", () => {
  it("documents only the query parameters ApplicationQuery actually declares", () => {
    expect([...SUPPORTED_LIST_FILTERS]).toEqual(["projects", "selector", "repo", "appNamespace"]);
    expect([...SUPPORTED_LIST_FILTERS]).not.toContain("fields");
  });

  it("keeps the measured list size on record, since it is what the read path is built around", () => {
    expect(MEASURED_LIST_APPLICATIONS).toBeGreaterThan(2000);
    expect(MEASURED_LIST_GZIP_BYTES).toBeLessThan(5 * 1024 * 1024);
  });
});

describe("projectResources", () => {
  const STATUS = {
    resources: [
      {
        group: "apps",
        version: "v1",
        kind: "Deployment",
        namespace: "app-one",
        name: "app-one",
        status: "OutOfSync",
        health: { status: "Progressing" },
        syncWave: 1,
      },
      { kind: "Service", name: "app-one", status: "Synced", health: { status: "Healthy" } },
      { kind: "ConfigMap", name: "stale", status: "OutOfSync", requiresPruning: true },
      { kind: "Job", name: "migrate", hook: true, status: "Synced" },
      // No comparison yet: ArgoCD leaves status empty, which is not the same as Unknown.
      { kind: "Secret", name: "pending" },
      { namespace: "app-one" },
    ],
  };

  it("projects every identifiable resource", () => {
    const resources = projectResources(STATUS);
    expect(resources.map((r) => r.name)).toEqual(["app-one", "app-one", "stale", "migrate", "pending"]);
  });

  it("keeps the full identity so a resource can be addressed", () => {
    expect(projectResources(STATUS)[0]).toEqual({
      group: "apps",
      version: "v1",
      kind: "Deployment",
      namespace: "app-one",
      name: "app-one",
      status: "OutOfSync",
      health: "Progressing",
      hook: false,
      requiresPruning: false,
      syncWave: 1,
    });
  });

  it("distinguishes an uncompared resource from an unknown one", () => {
    const pending = projectResources(STATUS).find((r) => r.name === "pending");
    expect(pending?.status).toBe("");
    expect(pending?.health).toBeUndefined();
  });

  it("flags hooks and resources awaiting pruning", () => {
    const resources = projectResources(STATUS);
    expect(resources.find((r) => r.name === "migrate")?.hook).toBe(true);
    expect(resources.find((r) => r.name === "stale")?.requiresPruning).toBe(true);
  });

  it("returns nothing when there are no resources", () => {
    expect(projectResources({})).toEqual([]);
    expect(projectResources(undefined)).toEqual([]);
    expect(projectResources({ resources: "nope" })).toEqual([]);
  });
});

describe("countResources", () => {
  it("counts each condition independently", () => {
    const resources = projectResources({
      resources: [
        { kind: "A", name: "a", status: "OutOfSync", health: { status: "Degraded" } },
        { kind: "B", name: "b", status: "OutOfSync", requiresPruning: true },
        { kind: "C", name: "c", status: "Synced", health: { status: "Healthy" } },
      ],
    });
    expect(countResources(resources)).toEqual({
      total: 3,
      outOfSync: 2,
      degraded: 1,
      needsPruning: 1,
    });
  });

  it("counts nothing for an empty inventory", () => {
    expect(countResources([])).toEqual({ total: 0, outOfSync: 0, degraded: 0, needsPruning: 0 });
  });
});

describe("resourceNeedsAttention", () => {
  const one = (raw: Record<string, unknown>) => projectResources({ resources: [raw] })[0]!;

  it("flags out of sync, degraded, missing and pending pruning", () => {
    expect(resourceNeedsAttention(one({ kind: "A", name: "a", status: "OutOfSync" }))).toBe(true);
    expect(resourceNeedsAttention(one({ kind: "A", name: "a", health: { status: "Degraded" } }))).toBe(true);
    expect(resourceNeedsAttention(one({ kind: "A", name: "a", health: { status: "Missing" } }))).toBe(true);
    expect(resourceNeedsAttention(one({ kind: "A", name: "a", requiresPruning: true }))).toBe(true);
  });

  it("leaves a synced and healthy resource alone", () => {
    expect(
      resourceNeedsAttention(one({ kind: "A", name: "a", status: "Synced", health: { status: "Healthy" } })),
    ).toBe(false);
  });

  it("does not flag a resource ArgoCD has not compared yet", () => {
    expect(resourceNeedsAttention(one({ kind: "A", name: "a" }))).toBe(false);
  });
});

describe("projectSyncPolicy", () => {
  it("reads an automated policy with prune and self-heal", () => {
    expect(
      projectSyncPolicy({
        syncPolicy: {
          automated: { prune: true, selfHeal: true, allowEmpty: false },
          syncOptions: ["CreateNamespace=true"],
        },
      }),
    ).toEqual({
      automated: true,
      prune: true,
      selfHeal: true,
      allowEmpty: false,
      syncOptions: ["CreateNamespace=true"],
    });
  });

  it("treats the presence of the automated block as the switch, as every version before 3.x did", () => {
    expect(projectSyncPolicy({ syncPolicy: { automated: {} } }).automated).toBe(true);
  });

  it("honours an explicit enabled: false", () => {
    expect(projectSyncPolicy({ syncPolicy: { automated: { enabled: false, prune: true } } }).automated).toBe(
      false,
    );
  });

  it("reports a manual application as not automated", () => {
    expect(projectSyncPolicy({ syncPolicy: { syncOptions: ["Validate=false"] } })).toEqual({
      automated: false,
      prune: false,
      selfHeal: false,
      allowEmpty: false,
      syncOptions: ["Validate=false"],
    });
    expect(projectSyncPolicy({}).automated).toBe(false);
    expect(projectSyncPolicy(undefined).automated).toBe(false);
  });
});

describe("projectHistory", () => {
  const STATUS = {
    history: [
      { id: 1, revision: "aaa", deployedAt: "2026-09-01T09:00:00Z", initiatedBy: { username: "someone" } },
      { id: 2, revision: "bbb", deployedAt: "2026-09-05T09:00:00Z", initiatedBy: { automated: true } },
      { id: 3, revision: "ccc", deployedAt: "2026-09-07T09:00:00Z", deployStartedAt: "2026-09-07T08:59:00Z" },
    ],
  };

  it("returns the most recent deployments first, since ArgoCD appends", () => {
    expect(projectHistory(STATUS).map((entry) => entry.revision)).toEqual(["ccc", "bbb", "aaa"]);
  });

  it("names who triggered each deployment", () => {
    const history = projectHistory(STATUS);
    expect(history[0]?.initiatedBy).toBeUndefined();
    expect(history[1]?.initiatedBy).toBe("automated");
    expect(history[2]?.initiatedBy).toBe("someone");
  });

  it("caps the history, because ArgoCD keeps a long one", () => {
    const long = { history: Array.from({ length: 20 }, (_, index) => ({ revision: `r${index}` })) };
    expect(projectHistory(long)).toHaveLength(5);
    expect(projectHistory(long, 2).map((entry) => entry.revision)).toEqual(["r19", "r18"]);
  });

  it("returns nothing for an application that never deployed", () => {
    expect(projectHistory({})).toEqual([]);
    expect(projectHistory({ history: "nope" })).toEqual([]);
  });
});

describe("projectResourceDiff", () => {
  const live = JSON.stringify({
    kind: "Deployment",
    spec: { replicas: 1, template: { spec: { containers: [{ name: "app", image: "x:1" }] } } },
    status: { readyReplicas: 1 },
    metadata: { name: "app", resourceVersion: "9" },
  });
  const target = JSON.stringify({
    kind: "Deployment",
    spec: { replicas: 2, template: { spec: { containers: [{ name: "app", image: "x:1" }] } } },
    metadata: { name: "app" },
  });

  it("computes the diff from the two states, because ArgoCD does not populate its diff field", () => {
    const projected = projectResourceDiff({
      group: "apps",
      kind: "Deployment",
      namespace: "app-one",
      name: "app",
      liveState: live,
      targetState: target,
    });
    expect(projected).toMatchObject({ modified: true, added: 1, removed: 1, tooLarge: false });
    expect(projected?.diff).toContain("-  replicas: 1");
    expect(projected?.diff).toContain("+  replicas: 2");
  });

  it("prefers normalizedLiveState, which already has the ignored fields removed", () => {
    const projected = projectResourceDiff({
      kind: "Deployment",
      name: "app",
      normalizedLiveState: JSON.stringify({ spec: { replicas: 5 } }),
      liveState: live,
      targetState: target,
    });
    expect(projected?.diff).toContain("replicas: 5");
  });

  it("reports no difference when the states match despite key order and cluster-written fields", () => {
    const projected = projectResourceDiff({
      kind: "Deployment",
      name: "app",
      liveState: live,
      targetState: JSON.stringify({
        metadata: { name: "app" },
        kind: "Deployment",
        spec: { template: { spec: { containers: [{ image: "x:1", name: "app" }] } }, replicas: 1 },
      }),
    });
    expect(projected).toMatchObject({ modified: false, added: 0, removed: 0, diff: "" });
  });

  it("treats a resource absent from the cluster as entirely added", () => {
    const projected = projectResourceDiff({ kind: "Secret", name: "new", targetState: target });
    expect(projected?.modified).toBe(true);
    expect(projected?.removed).toBe(0);
    expect(projected?.added).toBeGreaterThan(0);
  });

  it("uses ArgoCD's own diff string when it is actually there", () => {
    const projected = projectResourceDiff({
      kind: "Deployment",
      name: "app",
      diff: "- replicas: 1\n+ replicas: 2\n",
      liveState: live,
      targetState: target,
    });
    expect(projected?.diff).toBe("- replicas: 1\n+ replicas: 2");
    expect(projected?.modified).toBe(true);
  });

  it("drops the states that make up the bulk of the payload", () => {
    const projected = projectResourceDiff({ kind: "Deployment", name: "a", liveState: live });
    expect(projected).not.toHaveProperty("liveState");
    expect(projected).not.toHaveProperty("targetState");
    expect(projected).not.toHaveProperty("normalizedLiveState");
  });

  it("flags a manifest past the diff line limit instead of freezing on it", () => {
    const huge = JSON.stringify(
      Object.fromEntries(Array.from({ length: 4200 }, (_, index) => [`key${index}`, index])),
    );
    const projected = projectResourceDiff({
      kind: "ConfigMap",
      name: "huge",
      liveState: huge,
      targetState: "{}",
    });
    expect(projected).toMatchObject({ tooLarge: true, modified: true, diff: "" });
  });

  it("returns undefined for an entry it cannot identify", () => {
    expect(projectResourceDiff({})).toBeUndefined();
    expect(projectResourceDiff(null)).toBeUndefined();
  });
});

describe("projectRevisionMetadata", () => {
  it("reads the author, the date and the trimmed message", () => {
    expect(
      projectRevisionMetadata({
        author: "Someone <a@example.com>",
        date: "2026-09-07T09:00:00Z",
        message: "fix\n",
      }),
    ).toEqual({ author: "Someone <a@example.com>", date: "2026-09-07T09:00:00Z", message: "fix" });
  });

  it("tolerates an absent or empty answer", () => {
    expect(projectRevisionMetadata({})).toEqual({ author: undefined, date: undefined, message: undefined });
    expect(projectRevisionMetadata(undefined).author).toBeUndefined();
  });
});

describe("projectDetail resource inventory", () => {
  it("carries the resources, their counts, the policy and the history", () => {
    const detail = projectDetail(
      {
        metadata: { name: "app-one" },
        spec: { project: "team-a", syncPolicy: { automated: { prune: true } } },
        status: {
          sync: { status: "OutOfSync" },
          health: { status: "Progressing" },
          reconciledAt: "2026-09-08T09:30:00Z",
          resources: [{ kind: "Deployment", name: "app-one", status: "OutOfSync" }],
          history: [{ revision: "aaa", deployedAt: "2026-09-07T09:00:00Z" }],
        },
      },
      "i1",
    );
    expect(detail?.resources).toHaveLength(1);
    expect(detail?.resourceCounts).toMatchObject({ total: 1, outOfSync: 1 });
    expect(detail?.syncPolicy).toMatchObject({ automated: true, prune: true, selfHeal: false });
    expect(detail?.history.map((entry) => entry.revision)).toEqual(["aaa"]);
    expect(detail?.reconciledAt).toBe("2026-09-08T09:30:00Z");
  });

  it("stays sane for an application with no status at all", () => {
    const detail = projectDetail({ metadata: { name: "new" } }, "i1");
    expect(detail).toMatchObject({
      resources: [],
      resourceCounts: { total: 0, outOfSync: 0, degraded: 0, needsPruning: 0 },
      history: [],
      reconciledAt: undefined,
    });
    expect(detail?.syncPolicy.automated).toBe(false);
  });
});

describe("orderResources", () => {
  const resources = projectResources({
    resources: [
      { kind: "Service", name: "zeta", status: "Synced", health: { status: "Healthy" } },
      { kind: "Deployment", name: "alpha", status: "Synced", health: { status: "Healthy" } },
      { kind: "ConfigMap", name: "broken", status: "OutOfSync" },
      { kind: "Deployment", name: "sick", health: { status: "Degraded" } },
    ],
  });

  it("puts what needs attention first, then orders by kind and name", () => {
    expect(orderResources(resources).map((r) => r.name)).toEqual(["broken", "sick", "alpha", "zeta"]);
  });

  it("does not mutate the input", () => {
    const before = resources.map((r) => r.name);
    orderResources(resources);
    expect(resources.map((r) => r.name)).toEqual(before);
  });
});

describe("resourceKey", () => {
  it("addresses a resource the way ArgoCD's own deep links do", () => {
    const resource = projectResources({
      resources: [{ group: "apps", kind: "Deployment", namespace: "app-one", name: "app-one" }],
    })[0]!;
    expect(resourceKey(resource)).toBe("apps/Deployment/app-one/app-one");
  });

  it("keeps the empty group of a core resource, which is what ArgoCD expects", () => {
    const resource = projectResources({
      resources: [{ kind: "Service", namespace: "app-one", name: "app-one" }],
    })[0]!;
    expect(resourceKey(resource)).toBe("/Service/app-one/app-one");
  });
});
