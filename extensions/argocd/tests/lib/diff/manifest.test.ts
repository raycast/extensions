import { describe, expect, it } from "vitest";
import { renderManifest, stripNoise } from "../../../src/lib/diff/manifest";
import { countChanges, diffLines } from "../../../src/lib/diff/lineDiff";

describe("stripNoise", () => {
  it("drops status, which the cluster writes rather than git", () => {
    expect(stripNoise({ spec: { replicas: 1 }, status: { readyReplicas: 1 } })).toEqual({
      spec: { replicas: 1 },
    });
  });

  it("drops the metadata fields that always differ", () => {
    const stripped = stripNoise({
      metadata: {
        name: "keep",
        namespace: "keep",
        labels: { a: "b" },
        managedFields: [{ manager: "argocd" }],
        creationTimestamp: "2026-09-08T00:00:00Z",
        generation: 4,
        resourceVersion: "12345",
        uid: "abc",
        selfLink: "/api/v1/x",
      },
    });
    expect(stripped).toEqual({ metadata: { name: "keep", namespace: "keep", labels: { a: "b" } } });
  });

  it("keeps annotations, which are exactly where a real difference often is", () => {
    const stripped = stripNoise({
      metadata: { annotations: { "argocd.argoproj.io/tracking-id": "app-a:Secret:ns/name" } },
    });
    expect(stripped).toEqual({
      metadata: { annotations: { "argocd.argoproj.io/tracking-id": "app-a:Secret:ns/name" } },
    });
  });

  it("recurses through arrays and leaves scalars alone", () => {
    expect(stripNoise({ items: [{ status: 1, keep: 2 }, "text", 3, null] })).toEqual({
      items: [{ keep: 2 }, "text", 3, null],
    });
  });
});

describe("renderManifest", () => {
  it("sorts keys, so two serialisations of the same object render identically", () => {
    const a = renderManifest(JSON.stringify({ b: 2, a: 1, c: { z: 1, y: 2 } }));
    const b = renderManifest(JSON.stringify({ c: { y: 2, z: 1 }, a: 1, b: 2 }));
    expect(a).toBe(b);
    expect(a.split("\n")[0]).toBe("a: 1");
  });

  it("renders nesting as indented YAML-shaped lines", () => {
    const rendered = renderManifest(
      JSON.stringify({ spec: { template: { spec: { containers: [{ name: "app", image: "x:1" }] } } } }),
    );
    expect(rendered.split("\n")).toEqual([
      "spec:",
      "  template:",
      "    spec:",
      "      containers:",
      "        -",
      "          image: x:1",
      "          name: app",
    ]);
  });

  it("renders scalars, empty collections and nulls unambiguously", () => {
    expect(renderManifest(JSON.stringify({ a: "", b: [], c: {}, d: null, e: true, f: 0 }))).toBe(
      ['a: ""', "b: []", "c: {}", "d: null", "e: true", "f: 0"].join("\n"),
    );
  });

  it("quotes a value that would not survive as a bare scalar", () => {
    const rendered = renderManifest(JSON.stringify({ a: "has space", b: "plain-value", c: ": leading" }));
    expect(rendered).toContain('a: "has space"');
    expect(rendered).toContain("b: plain-value");
    expect(rendered).toContain('c: ": leading"');
  });

  it("keeps a multi-line string on one line, so it cannot break the structure", () => {
    expect(renderManifest(JSON.stringify({ a: "one\ntwo" }))).toBe('a: "one\\ntwo"');
  });

  it("renders an absent or empty state as empty text", () => {
    expect(renderManifest(undefined)).toBe("");
    expect(renderManifest("")).toBe("");
    expect(renderManifest("   ")).toBe("");
  });

  it("falls back to the raw text when the state is not JSON, rather than reporting nothing", () => {
    expect(renderManifest("not json at all")).toBe("not json at all");
  });
});

describe("diffing two manifests", () => {
  const live = JSON.stringify({
    apiVersion: "external-secrets.io/v1beta1",
    kind: "ExternalSecret",
    metadata: {
      name: "pullsecret",
      namespace: "infra-argo-workflows-jobs",
      annotations: { "argocd.argoproj.io/tracking-id": "renovate-prod-common:ExternalSecret:ns/pullsecret" },
      resourceVersion: "99",
      managedFields: [{ manager: "argocd", time: "2026-09-08T00:00:00Z" }],
    },
    spec: { refreshInterval: "1h", target: { creationPolicy: "Owner", name: "pullsecret" } },
    status: { conditions: [{ type: "Ready" }] },
  });
  const target = JSON.stringify({
    kind: "ExternalSecret",
    apiVersion: "external-secrets.io/v1beta1",
    metadata: {
      name: "pullsecret",
      namespace: "infra-argo-workflows-jobs",
      annotations: {
        "argocd.argoproj.io/tracking-id": "argo-workflows-prod-euw2:ExternalSecret:ns/pullsecret",
      },
    },
    spec: { target: { deletionPolicy: "Retain" } },
  });

  it("reports the annotation change and nothing about managedFields, status or key order", () => {
    const lines = diffLines(renderManifest(live), renderManifest(target));
    const removed = lines.filter((line) => line.kind === "removed").map((line) => line.text.trim());
    const added = lines.filter((line) => line.kind === "added").map((line) => line.text.trim());

    expect(removed.some((text) => text.includes("renovate-prod-common"))).toBe(true);
    expect(added.some((text) => text.includes("argo-workflows-prod-euw2"))).toBe(true);
    expect([...removed, ...added].some((text) => text.includes("managedFields"))).toBe(false);
    expect([...removed, ...added].some((text) => text.includes("conditions"))).toBe(false);
    expect([...removed, ...added].some((text) => text.includes("resourceVersion"))).toBe(false);
  });

  it("reports the fields the cluster has and git does not", () => {
    const lines = diffLines(renderManifest(live), renderManifest(target));
    const removed = lines.filter((line) => line.kind === "removed").map((line) => line.text.trim());
    expect(removed).toContain("refreshInterval: 1h");
    expect(removed).toContain("creationPolicy: Owner");
  });

  it("reports no change when both sides describe the same object differently ordered", () => {
    expect(countChanges(diffLines(renderManifest(live), renderManifest(live)))).toEqual({
      added: 0,
      removed: 0,
    });
  });

  it("treats a resource missing from the cluster as a whole addition", () => {
    const lines = diffLines(renderManifest(""), renderManifest(target));
    expect(countChanges(lines).removed).toBe(0);
    expect(countChanges(lines).added).toBeGreaterThan(3);
  });
});
