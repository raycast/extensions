import { readFile } from "node:fs/promises";
import { Color, LaunchType, environment, open } from "@raycast/api";
import { crossLaunchCommand } from "raycast-cross-extension";
import { commandConfig } from "./constants.js";

export const getCommandConfig = () => commandConfig[environment.commandName];

export const ellipsis = (text: string = "", maxLength: number = 20) =>
  text.length > maxLength ? text.slice(0, maxLength) + "…" : text;

export const codeBlock = (type: string, text: string) => "```" + type + "\n" + text + "\n```";

export const encodeBadgeContentParameters = (params: string[]) =>
  (params.length === 1 ? "-" : "") +
  params.map((p) => encodeURIComponent(p.replace(/-/g, "--").replace(/_/g, "__"))).join("-");

export const getTagColor = (active: boolean, activeColor?: Color.ColorLike) =>
  active ? (activeColor ?? Color.Green) : Color.SecondaryText;

export const pickColor = async ({ field }: { field: string }) =>
  crossLaunchCommand(
    {
      name: "color-wheel",
      type: LaunchType.UserInitiated,
      extensionName: "color-picker",
      ownerOrAuthorName: "thomas",
    },
    {
      context: {
        launchFromExtensionName: "color-picker",
        field,
      },
    },
  ).catch(() => open("raycast://extensions/thomas/color-picker"));

export const getSvgFromFile = async (file: string, color?: string) => {
  let svg = await readFile(file, "utf8");
  if (color) svg = svg.replace("<svg ", `<svg fill="#${color}" `);
  return svg;
};

export const pickLogo = async () => {
  try {
    await crossLaunchCommand(
      {
        name: "index",
        type: LaunchType.UserInitiated,
        extensionName: "simple-icons",
        ownerOrAuthorName: "litomore",
        context: {
          launchFromExtensionTitle: "Badges - shields.io",
        },
      },
      {
        context: {
          launchFromExtensionName: "simple-icons",
        },
      },
    );
  } catch {
    open("raycast://extensions/litomore/simple-icons");
  }
};
