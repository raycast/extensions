export enum LaunchType {
  UserInitiated = "userInitiated",
  Background = "background",
}

export enum Icon {
  Circle = "circle-16",
  CircleFilled = "circle-filled-16",
}

export const environment = {
  launchType: LaunchType.UserInitiated,
  commandName: "peon-ping-menu-bar",
};

export async function showHUD(_title: string): Promise<void> {}

export async function launchCommand(_options: unknown): Promise<void> {}

export function getPreferenceValues() {
  return {
    claudeConfigDir: undefined as string | undefined,
  };
}

export function MenuBarExtra(_props: unknown) {
  return null;
}

MenuBarExtra.Item = function MenuBarExtraItem(_props: unknown) {
  return null;
};
