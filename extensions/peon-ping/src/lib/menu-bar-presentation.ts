export type MenuBarIconToken = "on" | "off";

export type MenuBarPresentation = {
  title: string;
  tooltip: string;
  iconToken: MenuBarIconToken;
};

export function getMenuBarPresentation(input: {
  showMenuBarIcon: boolean;
  enabled: boolean;
}): MenuBarPresentation | null {
  if (!input.showMenuBarIcon) {
    return null;
  }
  if (input.enabled) {
    return {
      title: "Peon Ping",
      tooltip: "Peon Ping is on",
      iconToken: "on",
    };
  }
  return {
    title: "Peon Ping",
    tooltip: "Peon Ping is off",
    iconToken: "off",
  };
}
