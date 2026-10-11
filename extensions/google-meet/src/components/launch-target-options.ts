import type { LaunchTarget } from "../services/launch-target";

/** A profile's "Open In" choice: a specific target, or the extension preference. */
export type ProfileLaunchTargetChoice = LaunchTarget | "default";

export const profileLaunchTargetChoices: { value: ProfileLaunchTargetChoice; title: string }[] = [
  { value: "default", title: "Use Extension Setting" },
  { value: "browser", title: "Preferred Browser" },
  { value: "pwa", title: "Google Meet PWA" },
];

export function toLaunchTarget(choice: string | undefined): LaunchTarget | undefined {
  return choice === "browser" || choice === "pwa" ? choice : undefined;
}

export function toLaunchTargetChoice(launchTarget: LaunchTarget | undefined): ProfileLaunchTargetChoice {
  return launchTarget ?? "default";
}

/** Short label for a profile's own target; undefined when it follows the preference. */
export function getLaunchTargetLabel(launchTarget: LaunchTarget | undefined): string | undefined {
  if (launchTarget === "pwa") {
    return "PWA";
  }

  return launchTarget === "browser" ? "Browser" : undefined;
}
