import type { RokuApp } from "./types";

export interface ActionResult {
  confirmed: boolean;
  /** True when a switch command was accepted; readback is reported separately. */
  changed: boolean;
  message: string;
  activeApp?: RokuApp;
  /** The observed activity before an accepted switch, if the TV reported one. */
  previousApp?: RokuApp;
}

export interface ActivityAdapter {
  active(): Promise<RokuApp | undefined>;
  launch(id: string): Promise<void>;
  home(): Promise<void>;
  previous(): Promise<RokuApp | undefined>;
  remember(app: RokuApp): Promise<void>;
  clearPrevious(): Promise<void>;
  wait?(milliseconds: number): Promise<void>;
}

export function isHome(app: RokuApp | undefined): boolean {
  return app?.type === "home" || app?.id === "home";
}

/** The caller verifies the TV identity and serializes the complete operation. */
export function createActivityController(adapter: ActivityAdapter) {
  async function go(target: RokuApp, remember = true): Promise<ActionResult> {
    const before = await adapter.active();
    const matches = (app: RokuApp | undefined) => (isHome(target) ? isHome(app) : app?.id === target.id);
    if (matches(before))
      return { confirmed: true, changed: false, message: `${target.name} is already active`, activeApp: before };
    // Store history before changing the TV. A failed write must stop the switch,
    // and an unknown current activity must not leave an unrelated restore target.
    if (remember) {
      if (before) await adapter.remember(before);
      else await adapter.clearPrevious();
    }
    if (isHome(target)) await adapter.home();
    else await adapter.launch(target.id);
    for (const delay of [0, 300, 700, 1200, 1800]) {
      if (delay) await (adapter.wait?.(delay) ?? new Promise((resolve) => setTimeout(resolve, delay)));
      try {
        const activeApp = await adapter.active();
        if (matches(activeApp))
          return { confirmed: true, changed: true, message: `Opened ${target.name}`, activeApp, previousApp: before };
      } catch {
        /* The accepted command may take longer than the status query. */
      }
    }
    return {
      confirmed: false,
      changed: true,
      message: `${target.name} command sent; active state is not yet confirmed`,
      previousApp: before,
    };
  }
  return {
    launch: (id: string, name = id, remember = true) => go({ id, name }, remember),
    home: (remember = true) => go({ id: "home", name: "Roku Home", type: "home" }, remember),
    restoreKnown: (app: RokuApp) => go(app, false),
    async restore(): Promise<ActionResult> {
      const previous = await adapter.previous();
      if (!previous)
        throw new Error("No previous app or input is saved for this TV. Switch apps using this extension first.");
      return go(previous, false);
    },
  };
}

export interface RoutineActivityAdapter {
  launch(id: string, remember: boolean): Promise<ActionResult>;
  home(remember: boolean): Promise<ActionResult>;
  restore(): Promise<ActionResult>;
  restoreKnown(app: RokuApp): Promise<ActionResult>;
}

/** Keep this run's origin separate from history written by other controls. */
export function createRoutineActivityController(adapter: RoutineActivityAdapter) {
  let switched = false;
  let original: RokuApp | undefined;
  function capture(result: ActionResult): ActionResult {
    if (!switched && result.changed) {
      switched = true;
      original = result.previousApp ? { ...result.previousApp } : undefined;
    }
    return result;
  }
  return {
    launch: async (id: string) => capture(await adapter.launch(id, !switched)),
    home: async () => capture(await adapter.home(!switched)),
    async restore(): Promise<ActionResult> {
      if (!switched) return adapter.restore();
      if (!original)
        throw new Error("The TV did not report its original app or input. This routine cannot safely restore it.");
      return adapter.restoreKnown(original);
    },
  };
}
