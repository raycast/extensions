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
};

export const SCREEN_ENUMERATION_JXA = `
ObjC.import('AppKit');
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
  return {
    displayNumber: index + 1,
    name,
    x: Number(frame.origin.x),
    y: Number(primary.frame.size.height - (frame.origin.y + frame.size.height)),
    width: Number(frame.size.width),
    height: Number(frame.size.height),
    underMouse: index === selectedScreen,
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
    typeof screen.underMouse === "boolean"
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

export function screenUnderMouse(screens: Screen[]): Screen {
  return screens.find((screen) => screen.underMouse) ?? screens[0];
}
