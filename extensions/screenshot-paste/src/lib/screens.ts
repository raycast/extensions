import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);

export type Screen = {
  displayNumber: number;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  underMouse: boolean;
  builtIn: boolean;
};

export const SCREEN_ENUMERATION_JXA = `
ObjC.import('AppKit');
ObjC.import('CoreGraphics');
const mouse = $.NSEvent.mouseLocation;
const screens = $.NSScreen.screens.js;
const primary = screens.find((screen) => {
  const origin = screen.frame.origin;
  return origin.x === 0 && origin.y === 0;
}) || screens[0];
const screenUnderMouse = screens.findIndex((screen) => $.NSMouseInRect(mouse, screen.frame, false));
const closestScreen = screens.reduce((closest, screen, index) => {
  const frame = screen.frame;
  const distance = Math.hypot(
    mouse.x - (frame.origin.x + frame.size.width / 2),
    mouse.y - (frame.origin.y + frame.size.height / 2),
  );
  return distance < closest.distance ? { index, distance } : closest;
}, { index: 0, distance: Infinity }).index;
const selectedScreen = screenUnderMouse >= 0 ? screenUnderMouse : closestScreen;
const result = screens.map((screen, index) => {
  const frame = screen.frame;
  let name = '';
  try {
    const localizedName = screen.localizedName.js;
    name = localizedName == null ? '' : String(localizedName);
  } catch {}
  let builtIn = false;
  try {
    const displayId = screen.deviceDescription.objectForKey('NSScreenNumber').unsignedIntValue;
    builtIn = Boolean($.CGDisplayIsBuiltin(displayId));
  } catch {}
  return {
    displayNumber: index + 1,
    name,
    x: Number(frame.origin.x),
    y: Number(primary.frame.size.height - (frame.origin.y + frame.size.height)),
    width: Number(frame.size.width),
    height: Number(frame.size.height),
    underMouse: index === selectedScreen,
    builtIn,
  };
});
JSON.stringify(result);
`.trim();

function isScreen(value: unknown): value is Screen {
  if (!value || typeof value !== "object") {
    return false;
  }

  const screen = value as Record<string, unknown>;
  return (
    typeof screen.displayNumber === "number" &&
    typeof screen.name === "string" &&
    typeof screen.x === "number" &&
    typeof screen.y === "number" &&
    typeof screen.width === "number" &&
    typeof screen.height === "number" &&
    typeof screen.underMouse === "boolean" &&
    typeof screen.builtIn === "boolean"
  );
}

export async function enumerateScreens(): Promise<Screen[]> {
  const { stdout } = await execFile("/usr/bin/osascript", ["-l", "JavaScript", "-e", SCREEN_ENUMERATION_JXA]);
  const screens: unknown = JSON.parse(stdout.trim());

  if (!Array.isArray(screens) || screens.length === 0 || !screens.every(isScreen)) {
    throw new Error("No displays were returned by AppKit");
  }

  return screens;
}

function readingOrder(screens: readonly Screen[]): Screen[] {
  const rows: Screen[][] = [];
  for (const screen of [...screens].sort((a, b) => a.y - b.y || a.x - b.x)) {
    const row = rows.at(-1);
    if (row && screen.y + screen.height / 2 < row[0].y + row[0].height) {
      row.push(screen);
    } else {
      rows.push([screen]);
    }
  }
  return rows.flatMap((row) => row.sort((a, b) => a.x - b.x || a.displayNumber - b.displayNumber));
}

export function sortScreens(
  screens: readonly Screen[],
  order: "arrangement" | "system",
  builtInLast: boolean,
): Screen[] {
  const ordered = order === "arrangement" ? readingOrder(screens) : [...screens];
  return builtInLast
    ? [...ordered.filter((screen) => !screen.builtIn), ...ordered.filter((screen) => screen.builtIn)]
    : ordered;
}

export function screenUnderMouse(screens: Screen[]): Screen {
  return screens.find((screen) => screen.underMouse) ?? screens[0];
}
