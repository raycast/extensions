import { Color, LaunchType, launchCommand } from "@raycast/api";

export const ellipsis = (text: string = "", maxLength: number = 20) =>
  text.length > maxLength ? text.slice(0, maxLength) + "…" : text;

export const codeBlock = (type: string, text: string) => "```" + type + "\n" + text + "\n```";

export const encodeBadgeContentParameters = (params: string[]) =>
  params.map((p) => encodeURIComponent(p.replace(/-/g, "--").replace(/_/g, "__")));

export const getTagColor = (active: boolean, activeColor?: Color.ColorLike) =>
  active ? activeColor ?? Color.Green : Color.SecondaryText;

export const pickColor = async ({ launchCommandName, field }: { launchCommandName?: string; field: string }) => {
  try {
    await launchCommand({
      name: "pick-color",
      type: LaunchType.UserInitiated,
      extensionName: "color-picker",
      ownerOrAuthorName: "thomas",
      context: {
        callbackLaunchOptions: {
          name: launchCommandName,
          type: LaunchType.UserInitiated,
          extensionName: "badges",
          ownerOrAuthorName: "litomore",
          context: {
            launchFromExtensionName: "color-picker",
            field,
          },
        },
      },
    });
  } catch {
    open("raycast://extensions/thomas/color-picker");
  }
};
