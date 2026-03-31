import { Icon } from "@raycast/api";

export type MenuBarIconToken = "peonOn" | "peonOff";

export type MenuBarPresentation = {
  tooltip: string;
  iconToken: MenuBarIconToken;
  toggleTitle: string;
  toggleIcon: Icon;
};

export function getMenuBarPresentation(input: {
  enabled: boolean;
}): MenuBarPresentation {
  if (input.enabled) {
    return {
      tooltip: "Peon Ping is on",
      iconToken: "peonOn",
      toggleTitle: "Pause Peon Ping",
      toggleIcon: Icon.Pause,
    };
  }
  return {
    tooltip: "Peon Ping is off",
    iconToken: "peonOff",
    toggleTitle: "Resume Peon Ping",
    toggleIcon: Icon.Play,
  };
}
