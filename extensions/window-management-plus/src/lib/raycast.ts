// The Raycast and macOS side: reads and moves real windows. Every coordinate conversion lives here.

import {
  LaunchType,
  WindowManagement,
  closeMainWindow,
  environment,
  getPreferenceValues,
  launchCommand,
  showHUD,
} from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";
import { arrange, type System, type Win } from "./arrange";
import type { Frame, Layout } from "./layouts";

const jxa = (script: string) => runAppleScript(script, { language: "JavaScript" });
const jxaJSON = async <T>(script: string): Promise<T> => JSON.parse(await jxa(script));

type Panel = "notes" | "ai";

export const prefs = () => {
  const p = getPreferenceValues<Preferences>();
  return { gap: Number(p.gap) || 0, sidebar: p.sidebar ?? "notes" };
};

/**
 * Runs a command's work after the launcher closes. Without Raycast Pro the WindowManagement API is off,
 * so say that instead of failing. Any other error is shown rather than swallowed.
 */
export async function run(work: () => Promise<string>) {
  await closeMainWindow();
  if (!environment.canAccess(WindowManagement)) {
    await showFailureToast("Window Management+ needs Raycast Pro to move windows.", {
      title: "Raycast Pro required",
    });
    return;
  }
  try {
    await showHUD(await work());
  } catch (error) {
    await showFailureToast(error, { title: "Could not arrange windows" });
  }
}

/** Arrange every window, running the layout again when an app clamps the size it was given. */
export const tile = (layout: Layout, include?: () => Promise<string>) =>
  run(async () => apply(layout, 3, await include?.()));

/** For layouts that build on the current frames, like rotate and swap. Runs exactly once. */
export const permute = (layout: Layout) => run(() => apply(layout, 1));

async function apply(layout: Layout, passes: number, include?: string) {
  const { count, failed } = await arrange(raycastSystem(include), layout, passes);
  if (!count) return "No windows to arrange";
  if (!failed.length) return "Arranged";
  if (failed.length === count) throw new Error(`No window could be moved (${failed.join(", ")}).`);
  return `Arranged, but could not move ${failed.join(", ")}`;
}

// Screens

type Screen = { name: string; frame: Frame; visible: Frame };

/** Every screen in global top-left coordinates. `visible` leaves out the menu bar and Dock. */
const screensScript = `ObjC.import("AppKit")
const s = $.NSScreen.screens
const primaryH = s.objectAtIndex(0).frame.size.height
const out = []
for (let i = 0; i < s.count; i++) {
  const sc = s.objectAtIndex(i), f = sc.frame, v = sc.visibleFrame
  out.push({
    name: ObjC.unwrap(sc.localizedName),
    frame: { x: f.origin.x, y: primaryH - (f.origin.y + f.size.height), width: f.size.width, height: f.size.height },
    visible: { x: v.origin.x, y: primaryH - (v.origin.y + v.size.height), width: v.size.width, height: v.size.height },
  })
}
JSON.stringify(out)`;

const holdsCentre = (area: Frame, f: Frame) => {
  const x = f.x + f.width / 2;
  const y = f.y + f.height / 2;
  return x >= area.x && x < area.x + area.width && y >= area.y && y < area.y + area.height;
};

/** The Raycast API works in each screen's own coordinates, macOS in global ones. */
const toLocal = (f: Frame, s: Screen): Frame => ({
  ...f,
  x: f.x - s.frame.x,
  y: f.y - s.frame.y,
});
const toGlobal = (f: Frame, s: Screen): Frame => ({
  ...f,
  x: f.x + s.frame.x,
  y: f.y + s.frame.y,
});

// Raycast's own windows, through System Events

const RAYCAST = "com.raycast.macos";
const LAUNCHER = "Main Window";
const PANELS: Record<Panel, { title: string; extensionName: string; name: string }> = {
  notes: { title: "Notes", extensionName: "raycast-notes", name: "raycast-notes" },
  ai: { title: "AI Chat", extensionName: "raycast-ai", name: "ai-chat" },
};

export const panelTitle = (panel: Panel) => PANELS[panel].title;

const raycastProcess = `Application("System Events").processes.byName("Raycast")`;

/** Raycast's API has no window titles and doesn't list Notes at all. System Events has both, in global coordinates. */
const raycastWindows = async (): Promise<(Frame & { title: string })[]> => {
  try {
    return await jxaJSON(`JSON.stringify(${raycastProcess}.windows().map((w) => ({
  title: w.name(), x: w.position()[0], y: w.position()[1], width: w.size()[0], height: w.size()[1] })))`);
  } catch (error) {
    throw new Error(
      "Could not read Raycast's windows. Allow Raycast to control System Events in System Settings › Privacy & Security › Automation.",
      { cause: error },
    );
  }
};

/** Set twice, because a window resized against a screen edge can land short the first time. */
const moveRaycastWindow = (title: string, f: Frame) => {
  const position = `[${Math.round(f.x)}, ${Math.round(f.y)}]`;
  const size = `[${Math.round(f.width)}, ${Math.round(f.height)}]`;
  return jxa(`const w = ${raycastProcess}.windows.byName(${JSON.stringify(title)})
w.position = ${position}
w.size = ${size}
w.position = ${position}
w.size = ${size}`);
};

/** Opens Raycast Notes or AI Chat when it isn't open yet. Returns its window title. */
export async function openPanel(panel: Panel): Promise<string> {
  const { title, extensionName, name } = PANELS[panel];
  const isOpen = async () => (await raycastWindows()).some((w) => w.title === title);
  if (await isOpen()) return title;
  await launchCommand({ ownerOrAuthorName: "raycast", extensionName, name, type: LaunchType.UserInitiated });
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 150));
    if (await isOpen()) return title;
  }
  throw new Error(`Raycast ${title} did not open.`);
}

// The window system

const near = (a: Frame, b: Frame) => (["x", "y", "width", "height"] as const).every((k) => Math.abs(a[k] - b[k]) < 3);

/**
 * Windows on the active desktop, minus fullscreen ones, ones parked off their screen and Raycast's launcher.
 * `include` names a Raycast window to arrange even when the API leaves it out. It is moved through System Events.
 */
function raycastSystem(include?: string): System {
  const screens = jxaJSON<Screen[]>(screensScript);
  const listed = new Map<string, { win: Win; api?: WindowManagement.Window }>();

  return {
    areas: async () => (await screens).map((s) => toLocal(s.visible, s)),

    async windows() {
      const all = await screens;
      const [windows, desktops, raycast] = await Promise.all([
        WindowManagement.getWindowsOnActiveDesktop(),
        WindowManagement.getDesktops(),
        raycastWindows(),
      ]);
      const titled = raycast.map((w) => {
        const screen = Math.max(
          0,
          all.findIndex((s) => holdsCentre(s.frame, w)),
        );
        return { title: w.title, screen, frame: toLocal(w, all[screen]) };
      });

      listed.clear();
      for (const api of windows) {
        if (!api.positionable || api.bounds === "fullscreen") continue;
        const { position, size } = api.bounds;
        const frame = {
          x: position.x,
          y: position.y,
          width: size.width,
          height: size.height,
        };

        // Desktops are matched to a screen by name
        const name = desktops.find((d) => d.id === api.desktopId)?.screenId;
        const screen = all.length === 1 ? 0 : all.findIndex((s) => s.name === name);
        if (screen === -1 || !holdsCentre(toLocal(all[screen].frame, all[screen]), frame)) continue;

        const title =
          api.application?.bundleId === RAYCAST ? titled.find((t) => near(t.frame, frame))?.title : undefined;
        if (title === LAUNCHER) continue;
        listed.set(api.id, {
          win: {
            id: api.id,
            screen,
            frame,
            resizable: api.resizable,
            active: api.active,
            title,
          },
          api,
        });
      }

      const hidden = include && titled.find((t) => t.title === include);
      if (hidden && ![...listed.values()].some((l) => l.win.title === include)) {
        listed.set(`raycast:${include}`, {
          win: { id: `raycast:${include}`, ...hidden, resizable: true },
        });
      }
      return [...listed.values()].map((l) => l.win);
    },

    async place(placements) {
      const all = await screens;
      const failed = await Promise.all(
        placements.map(async ({ id, frame }) => {
          const target = listed.get(id);
          if (!target) return undefined;
          const { win, api } = target;
          try {
            await (api
              ? WindowManagement.setWindowBounds({
                  id,
                  desktopId: api.desktopId,
                  bounds: {
                    position: { x: frame.x, y: frame.y },
                    ...(api.resizable ? { size: { width: frame.width, height: frame.height } } : {}),
                  },
                })
              : moveRaycastWindow(win.title!, toGlobal(frame, all[win.screen])));
            return undefined;
          } catch (error) {
            const name = api?.application?.name ?? win.title ?? id;
            console.error("move", name, String(error));
            return name;
          }
        }),
      );
      return failed.filter((name): name is string => name !== undefined);
    },
  };
}
