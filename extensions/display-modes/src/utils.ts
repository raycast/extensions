import { environment, Icon } from "@raycast/api";
import { execa, execaSync } from "execa";
import { chmod } from "fs/promises";
import { join } from "path";
import { DisplayInfo, Mode, DisplayKind } from "./types";

export async function listDisplays(): Promise<DisplayInfo[] | undefined> {
  const command = join(environment.assetsPath, "display-modes");
  await chmod(command, "755");

  try {
    const { stdout } = await execa(command, ["list-displays", "--json"]);

    const parsed: DisplayInfo[] = JSON.parse(stdout);

    return parsed;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function setMode(displayId: number, mode: Mode): Promise<boolean | undefined> {
  const command = join(environment.assetsPath, "display-modes");
  await chmod(command, "755");

  try {
    const { stdout } = execaSync(
      command,
      [
        "set-mode",
        `${displayId}`,
        "-w",
        `${mode.width}`,
        "-h",
        `${mode.height}`,
        "-s",
        `${mode.scale}`,
        "-r",
        `${mode.refreshRate}`,
        "--json",
      ],
      { timeout: 5000 },
    );

    const parsed: boolean = JSON.parse(stdout);

    return parsed;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export function sortModes(modes: Mode[]): Mode[] {
  return modes.sort((a, b) => {
    // Sort by resolution (higher first), then by refresh rate (higher first)
    const aPixels = a.width * a.height;
    const bPixels = b.width * b.height;

    if (aPixels !== bPixels) {
      return bPixels - aPixels;
    }

    return b.refreshRate - a.refreshRate;
  });
}

export function formatDisplayMode(mode: Mode): string {
  const widthFormatted = mode.width.toString();
  const heightFormatted = mode.height.toString();
  const scaleFormatted = mode.scale?.toString() ?? "N/A";
  const refreshRateFormatted = mode.refreshRate.toString();

  return `${widthFormatted} x ${heightFormatted} @ ${scaleFormatted}x ${refreshRateFormatted}Hz`;
}

export function formatDisplayKind(kind: DisplayKind): string {
  switch (kind) {
    case DisplayKind.builtIn:
      return "Built-in";
    case DisplayKind.external:
      return "External";
    default:
      return "Unknown";
  }
}

export function formatDisplayTitle(display: DisplayInfo): string {
  return `Display ${display.display.id} (${formatDisplayKind(display.display.kind)})`;
}

export function formatDisplaySubtitle(display: DisplayInfo): string {
  return formatDisplayMode(display.currentMode);
}

export function getDisplayIcon(kind: DisplayKind): Icon {
  return kind === DisplayKind.builtIn ? Icon.ComputerChip : Icon.Monitor;
}
