import { existsSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import packageJson from "../package.json";

const extensionRoot = process.cwd();

describe("Raycast command manifest", () => {
  it("registers every ScreenLex action as a direct command with its own icon", () => {
    const commands = packageJson.commands as Array<{
      name: string;
      title: string;
      mode: string;
      icon?: string;
    }>;

    expect(
      commands.map(({ name, title, mode, icon }) => ({
        name,
        title,
        mode,
        icon,
      })),
    ).toEqual([
      {
        name: "capture-area",
        title: "Capture Area",
        mode: "no-view",
        icon: "capture-area.png",
      },
      {
        name: "capture-window",
        title: "Capture Window",
        mode: "no-view",
        icon: "capture-window.png",
      },
      {
        name: "capture-full-screen",
        title: "Capture Full Screen",
        mode: "no-view",
        icon: "capture-full-screen.png",
      },
      {
        name: "translate-area",
        title: "Translate Area",
        mode: "no-view",
        icon: "translate-area.png",
      },
      {
        name: "translate-window",
        title: "Translate Window",
        mode: "no-view",
        icon: "translate-window.png",
      },
      {
        name: "translate-full-screen",
        title: "Translate Full Screen",
        mode: "no-view",
        icon: "translate-full-screen.png",
      },
      {
        name: "open-screenlex",
        title: "Open ScreenLex",
        mode: "no-view",
        icon: "open-screenlex.png",
      },
      {
        name: "open-history",
        title: "Open History",
        mode: "no-view",
        icon: "open-history.png",
      },
      {
        name: "open-settings",
        title: "Open Settings",
        mode: "no-view",
        icon: "open-settings.png",
      },
    ]);

    for (const { icon } of commands) {
      const iconPath = `${extensionRoot}/assets/${icon}`;
      expect(existsSync(iconPath)).toBe(true);

      const image = readFileSync(iconPath);
      expect(image.subarray(1, 4).toString("ascii")).toBe("PNG");
      expect(image.readUInt32BE(16)).toBe(512);
      expect(image.readUInt32BE(20)).toBe(512);
    }

    expect(existsSync(`${extensionRoot}/src/index.tsx`)).toBe(false);
  });

  it("supports the Node version required by the Raycast API", () => {
    expect(packageJson.engines.node).toBe(">=22.22.2");
  });
});
