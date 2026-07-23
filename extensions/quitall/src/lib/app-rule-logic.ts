import type { AppRule, AppRulesState, QuitPlan, RunningApplication } from "../types.ts";

export const DEFAULT_RULES: AppRulesState = {
  version: 1,
  rules: {
    "com.apple.finder": "whitelist",
  },
};

const RAYCAST_BUNDLE_IDS = new Set(["com.raycast.macos", "com.raycast.macos.beta"]);

export function isProtectedBundleId(bundleId: string): boolean {
  return RAYCAST_BUNDLE_IDS.has(bundleId) || bundleId.startsWith("com.raycast.macos.");
}

export function normalizeRules(value: unknown): AppRulesState {
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.rules)) {
    return structuredClone(DEFAULT_RULES);
  }

  const rules: AppRulesState["rules"] = {};

  for (const [bundleId, rule] of Object.entries(value.rules)) {
    if (bundleId.length > 0 && !isProtectedBundleId(bundleId) && (rule === "whitelist" || rule === "force")) {
      rules[bundleId] = rule;
    }
  }

  return { version: 1, rules };
}

export function getAppRule(state: AppRulesState, bundleId: string): AppRule {
  if (isProtectedBundleId(bundleId)) {
    return "whitelist";
  }

  return state.rules[bundleId] ?? "default";
}

export function createQuitPlan(applications: RunningApplication[], state: AppRulesState): QuitPlan {
  const plan: QuitPlan = {
    forceAfterTimeout: [],
    protected: [],
    requestNormalQuit: [],
    whitelisted: [],
  };

  for (const application of applications) {
    if (isProtectedBundleId(application.bundleId)) {
      plan.protected.push(application);
      continue;
    }

    const rule = getAppRule(state, application.bundleId);

    if (rule === "whitelist") {
      plan.whitelisted.push(application);
      continue;
    }

    plan.requestNormalQuit.push(application);

    if (rule === "force") {
      plan.forceAfterTimeout.push(application);
    }
  }

  return plan;
}

export function keepStillRunning(original: RunningApplication[], current: RunningApplication[]): RunningApplication[] {
  const identities = new Set(current.map((application) => identityKey(application)));
  return original.filter((application) => identities.has(identityKey(application)));
}

function identityKey(application: Pick<RunningApplication, "bundleId" | "pid">): string {
  return `${application.pid}:${application.bundleId}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
