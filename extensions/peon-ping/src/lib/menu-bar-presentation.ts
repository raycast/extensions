export type MenuBarIconToken = "peonOn" | "peonOff";

export type MenuBarPresentation = {
  tooltip: string;
  iconToken: MenuBarIconToken;
};

export function getMenuBarPresentation(input: {
  enabled: boolean;
}): MenuBarPresentation {
  if (input.enabled) {
    return {
      tooltip: "Peon Ping is on",
      iconToken: "peonOn",
    };
  }
  return {
    tooltip: "Peon Ping is off",
    iconToken: "peonOff",
  };
}
