import { describe, expect, it } from "vitest";
import {
  classifyProblem,
  monitorState,
  monitorTitle,
  monitorTooltip,
  summarize,
  type InstanceReport,
} from "../../../src/lib/monitor/summary";
import { projectSummary } from "../../../src/lib/argocd/project";
import { UnreachableError } from "../../../src/lib/argocd/errors";
import { AuthError } from "../../../src/lib/auth/provider";
import type { AppSummary } from "../../../src/lib/argocd/types";
import type { ArgoInstance } from "../../../src/lib/config/instances";

function instance(overrides: Partial<ArgoInstance> = {}): ArgoInstance {
  return {
    id: "i1",
    name: "dev",
    baseUrl: "https://argocd.example.com",
    env: "dev",
    authMode: "token",
    allowWrite: false,
    enabled: true,
    ...overrides,
  };
}

function app(name: string, overrides: Partial<AppSummary> = {}): AppSummary {
  const base = projectSummary(
    {
      metadata: { name },
      spec: { project: "team-a" },
      status: { sync: { status: "Synced" }, health: { status: "Healthy" } },
    },
    "i1",
  );
  if (!base) {
    throw new Error("fixture failed to project");
  }
  return { ...base, ...overrides };
}

function report(overrides: Partial<InstanceReport> = {}): InstanceReport {
  return { instance: instance(), apps: [], error: undefined, ageSeconds: 0, ...overrides };
}

const HEALTHY = app("healthy");
const DEGRADED = app("broken", { health: "Degraded" });
const MISSING = app("gone", { health: "Missing" });
const DRIFTED = app("drifted", { sync: "OutOfSync" });
const BOTH = app("both", { health: "Degraded", sync: "OutOfSync" });

describe("summarize", () => {
  it("separates degraded from out of sync, since they call for different reactions", () => {
    const summary = summarize([report({ apps: [HEALTHY, DEGRADED, DRIFTED] })]);
    expect(summary.degradedCount).toBe(1);
    expect(summary.outOfSyncCount).toBe(1);
    expect(summary.totalCount).toBe(3);
  });

  it("keeps missing apart from degraded, since they are different conditions", () => {
    const summary = summarize([report({ apps: [MISSING, DEGRADED] })]);
    expect(summary.degradedCount).toBe(1);
    expect(summary.missingCount).toBe(1);
    expect(summary.instances[0]?.missing.map((a) => a.name)).toEqual(["gone"]);
  });

  it("counts an application that is both once, as degraded", () => {
    const summary = summarize([report({ apps: [BOTH] })]);
    expect(summary.degradedCount).toBe(1);
    expect(summary.outOfSyncCount).toBe(0);
  });

  it("ignores a healthy and synced application", () => {
    const summary = summarize([report({ apps: [HEALTHY] })]);
    expect(summary.degradedCount + summary.outOfSyncCount).toBe(0);
    expect(summary.totalCount).toBe(1);
  });

  it("ignores a suspended application, which is deliberate rather than broken", () => {
    expect(summarize([report({ apps: [app("paused", { health: "Suspended" })] })]).degradedCount).toBe(0);
  });

  it("sorts each list by name, so the menu does not reshuffle between refreshes", () => {
    const apps = [app("zebra", { health: "Degraded" }), app("alpha", { health: "Degraded" })];
    expect(summarize([report({ apps })]).instances[0]?.degraded.map((a) => a.name)).toEqual(["alpha", "zebra"]);
  });

  it("keeps instances apart and aggregates across them", () => {
    const summary = summarize([
      report({ instance: instance({ id: "i1", name: "dev" }), apps: [DEGRADED] }),
      report({ instance: instance({ id: "i2", name: "prod", env: "prod" }), apps: [DRIFTED, DEGRADED] }),
    ]);
    expect(summary.instances.map((i) => i.name)).toEqual(["dev", "prod"]);
    expect(summary.degradedCount).toBe(2);
    expect(summary.outOfSyncCount).toBe(1);
  });

  it("records an instance that could not be refreshed and why", () => {
    const summary = summarize([
      report({ apps: [HEALTHY], error: new Error("dev is unreachable. Check your VPN connection.") }),
    ]);
    expect(summary.unreportedInstances).toEqual(["dev"]);
    expect(summary.instances[0]?.problem).toMatch(/unreachable/);
  });

  it("handles no instances at all", () => {
    expect(summarize([])).toMatchObject({
      instances: [],
      degradedCount: 0,
      outOfSyncCount: 0,
      totalCount: 0,
      unreportedInstances: [],
    });
  });
});

describe("monitorState", () => {
  it("reports degraded ahead of everything else", () => {
    expect(monitorState(summarize([report({ apps: [DEGRADED, DRIFTED] })]))).toBe("degraded");
  });

  it("reports drift when nothing is degraded or missing", () => {
    expect(monitorState(summarize([report({ apps: [DRIFTED] })]))).toBe("drifting");
  });

  it("reports missing between degraded and drift", () => {
    expect(monitorState(summarize([report({ apps: [MISSING, DRIFTED] })]))).toBe("missing");
    expect(monitorState(summarize([report({ apps: [DEGRADED, MISSING] })]))).toBe("degraded");
  });

  it("reports a real failure ahead of a stale instance", () => {
    const summary = summarize([report({ apps: [DEGRADED], error: new Error("unreachable") })]);
    expect(monitorState(summary)).toBe("degraded");
  });

  it("reports stale only once nothing is known to be wrong", () => {
    expect(monitorState(summarize([report({ apps: [HEALTHY], error: new Error("unreachable") })]))).toBe("stale");
  });

  it("reports healthy when everything is in order", () => {
    expect(monitorState(summarize([report({ apps: [HEALTHY] })]))).toBe("healthy");
  });

  it("reports empty when no instance is configured", () => {
    expect(monitorState(summarize([]))).toBe("empty");
  });
});

describe("monitorTitle", () => {
  const options = { showWhenHealthy: false };

  it("carries only the urgent number, since a menu bar has very little room", () => {
    expect(monitorTitle(summarize([report({ apps: [DEGRADED, MISSING, DRIFTED] })]), options)).toBe("1 degraded");
  });

  it("falls back to missing, then to drift", () => {
    expect(monitorTitle(summarize([report({ apps: [MISSING, DRIFTED] })]), options)).toBe("1 missing");
    expect(monitorTitle(summarize([report({ apps: [DRIFTED] })]), options)).toBe("1 out of sync");
  });

  it("reports drift on its own", () => {
    expect(monitorTitle(summarize([report({ apps: [DRIFTED, app("d2", { sync: "OutOfSync" })] })]), options)).toBe(
      "2 out of sync",
    );
  });

  it("stays quiet when everything is healthy", () => {
    expect(monitorTitle(summarize([report({ apps: [HEALTHY] })]), options)).toBeUndefined();
  });

  it("shows a count when everything is healthy and that was asked for", () => {
    expect(monitorTitle(summarize([report({ apps: [HEALTHY] })]), { showWhenHealthy: true })).toBe("1 healthy");
  });

  it("names the unreachable instance when there is one, and counts them when there are more", () => {
    const one = summarize([report({ apps: [HEALTHY], error: new Error("x") })]);
    expect(monitorTitle(one, options)).toBe("dev unreachable");

    const two = summarize([
      report({ instance: instance({ id: "i1", name: "dev" }), error: new Error("x") }),
      report({ instance: instance({ id: "i2", name: "prod" }), error: new Error("x") }),
    ]);
    expect(monitorTitle(two, options)).toBe("2 instances unreachable");
  });

  it("stays quiet with no instance configured, whatever the option says", () => {
    expect(monitorTitle(summarize([]), { showWhenHealthy: true })).toBeUndefined();
  });
});

describe("monitorTooltip", () => {
  it("lists each instance with its counts", () => {
    const summary = summarize([
      report({ instance: instance({ id: "i1", name: "dev" }), apps: [DEGRADED, DRIFTED, HEALTHY] }),
      report({ instance: instance({ id: "i2", name: "prod" }), apps: [HEALTHY] }),
    ]);
    expect(monitorTooltip(summary)).toBe("dev: 1 degraded, 1 out of sync of 3\nprod: all healthy of 1");
  });

  it("says so when nothing is configured", () => {
    expect(monitorTooltip(summarize([]))).toBe("No ArgoCD instance configured");
  });
});

describe("classifyProblem", () => {
  it("names the kind rather than the message, since each kind is fixed elsewhere", () => {
    expect(classifyProblem(new UnreachableError("dev", "no answer within 4s"))).toBe("unreachable");
    expect(classifyProblem(new AuthError("no session", "i1", "argocd.example.com"))).toBe("auth");
    expect(classifyProblem(new Error("something else"))).toBe("other");
    expect(classifyProblem(undefined)).toBeUndefined();
  });

  it("reaches the summary, so the menu can route without matching on words", () => {
    const summary = summarize([
      report({ instance: instance({ id: "i1", name: "dev" }), error: new UnreachableError("dev") }),
      report({
        instance: instance({ id: "i2", name: "prod" }),
        error: new AuthError("expired", "i2", "argocd.example.com"),
      }),
      report({ instance: instance({ id: "i3", name: "other" }) }),
    ]);
    expect(summary.instances.map((i) => i.problemKind)).toEqual(["unreachable", "auth", undefined]);
  });
});
