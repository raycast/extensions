import { VessloApp } from "../types";
import { resolveAppActions } from "./action-policy";
import { VessloDataState } from "./data-state";

export type AppIntent = "update" | "open" | "finder";
export interface ActionEffects {
  read: () => Promise<VessloDataState>;
  open: (target: string) => Promise<void>;
  reveal: (path: string) => Promise<void>;
}
export type ActionResult =
  | { kind: "opened" | "handedOff" }
  | { kind: "blocked"; reason: string };

export function createAppActionExecutor(effects: ActionEffects) {
  const pending = new Set<string>();
  return async (
    displayed: VessloApp,
    intent: AppIntent,
  ): Promise<ActionResult> => {
    if (pending.has(displayed.id)) {
      return {
        kind: "blocked",
        reason: "This app already has a handoff in progress.",
      };
    }
    pending.add(displayed.id);
    try {
      const state = await effects.read();
      const current = state.data?.apps.find((app) => app.id === displayed.id);
      if (
        !current ||
        current.path !== displayed.path ||
        current.bundleId !== displayed.bundleId
      ) {
        return {
          kind: "blocked",
          reason:
            "The app record changed. Review the refreshed list in Vesslo.",
        };
      }
      const policy = resolveAppActions(current, state);
      if (intent === "update") {
        if (
          current.targetVersion !== displayed.targetVersion ||
          current.version !== displayed.version ||
          current.primaryActionKind !== displayed.primaryActionKind ||
          current.eligibilityKind !== displayed.eligibilityKind ||
          current.appStoreId !== displayed.appStoreId ||
          current.homebrewCask !== displayed.homebrewCask ||
          JSON.stringify([...new Set(current.sources)].sort()) !==
            JSON.stringify([...new Set(displayed.sources)].sort())
        ) {
          return {
            kind: "blocked",
            reason:
              "The update candidate changed. Review the refreshed list before continuing.",
          };
        }
        if (policy.update.kind === "handoff") {
          await effects.open(
            `vesslo://update/${encodeURIComponent(policy.update.bundleId)}`,
          );
          return { kind: "handedOff" };
        }
        if (policy.update.kind === "openAppStore") {
          await effects.open(policy.update.url);
          return { kind: "opened" };
        }
      } else if (intent === "open" && policy.canOpenApp) {
        await effects.open(current.path);
        return { kind: "opened" };
      } else if (intent === "finder" && policy.canShowInFinder) {
        await effects.reveal(current.path);
        return { kind: "opened" };
      }
      return {
        kind: "blocked",
        reason:
          policy.reviewReason ??
          "This action is unavailable. Refresh the app data in Vesslo.",
      };
    } finally {
      pending.delete(displayed.id);
    }
  };
}
