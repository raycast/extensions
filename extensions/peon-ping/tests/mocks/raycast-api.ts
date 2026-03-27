export enum LaunchType {
  UserInitiated = "userInitiated",
  Background = "background",
}

export async function showHUD(_title: string): Promise<void> {}

export async function launchCommand(_options: unknown): Promise<void> {}

export function getPreferenceValues() {
  return {
    showMenuBarIcon: true,
    claudeConfigDir: undefined as string | undefined,
  };
}
