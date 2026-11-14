import {
  AppGroup,
  AXWindow,
  Window,
  focusNativeWindowById,
  queryAXWindows,
  queryWindows,
  getRunningApplications,
  raiseAXWindow,
  requestApplicationWindow,
  sameWindow,
} from "./windows";

export interface FocusOperations {
  queryWindows: () => Promise<Window[]>;
  queryAXWindows: (pid: number) => Promise<AXWindow[]>;
  focusNativeWindowById: (id: number, pid?: number) => Promise<void>;
  raiseAXWindow: (window: AXWindow) => Promise<void>;
  requestApplicationWindow: (app: AppGroup) => Promise<void>;
  getRunningApplications: typeof getRunningApplications;
}

const systemOperations: FocusOperations = {
  queryWindows,
  queryAXWindows,
  focusNativeWindowById,
  raiseAXWindow,
  requestApplicationWindow,
  getRunningApplications,
};

export async function focusNativeWindow(target: Window, ops = systemOperations): Promise<"focused" | "missing"> {
  const current = (await ops.queryWindows()).find((window) => sameWindow(window, target));
  if (!current) return "missing";
  if (current["has-ax-reference"] === false) {
    throw new Error("No Accessibility reference for this window. Refresh the list.");
  }

  try {
    await ops.focusNativeWindowById(current.id, current.pid);
    return "focused";
  } catch (error) {
    // A closed window should disappear from the list; a query failure must
    // preserve the original focus error rather than treating it as closure.
    const latest = await ops.queryWindows().catch(() => null);
    if (latest && !latest.some((window) => sameWindow(window, target))) return "missing";
    throw error;
  }
}

/** Reopening is allowed only after a successful AX query reports zero windows. */
export async function activateApplication(
  app: AppGroup,
  ops = systemOperations,
): Promise<"focused" | "missing" | "multiple"> {
  if (app.windows.length === 0) {
    const running = await ops.getRunningApplications();
    const live = running.filter(
      (current) => app.pids.includes(current.pid) && (!app.bundlePath || current.bundlePath === app.bundlePath),
    );
    if (live.length === 0) return "missing";
    const windows = (await Promise.all(live.map((current) => ops.queryAXWindows(current.pid)))).flat();
    if (windows.length > 1) return "multiple";
    if (windows.length === 1) await ops.raiseAXWindow(windows[0]);
    else await ops.requestApplicationWindow(app);
    return "focused";
  }

  const current = (await ops.queryWindows()).find((window) =>
    app.windows.some((original) => sameWindow(window, original)),
  );
  if (!current) return "missing";

  if (app.windows.length === 1 && current["has-ax-reference"] !== false) {
    try {
      await ops.focusNativeWindowById(current.id, current.pid);
      return "focused";
    } catch {
      // Continue with Accessibility without creating a duplicate app window.
    }
  }

  const accessibleWindows = await ops.queryAXWindows(current.pid);
  if (accessibleWindows.length > 1) return "multiple";
  if (accessibleWindows.length === 1) {
    await ops.raiseAXWindow(accessibleWindows[0]);
  } else {
    await ops.requestApplicationWindow(app);
  }
  return "focused";
}
