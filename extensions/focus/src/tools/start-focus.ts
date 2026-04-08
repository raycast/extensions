import { getInstallStatus, startFocus, startFocusCustom, startFocusWithProfile } from "../utils";

type Input = {
  /**
   * The name of the Focus profile to use. Leave empty to use the default profile.
   * Use the get-status tool first to see available profiles.
   */
  profile?: string;
  /**
   * Duration in minutes. Leave empty for an unlimited session.
   */
  minutes?: number;
  /**
   * Duration in hours. Can be combined with minutes.
   */
  hours?: number;
};

/**
 * Starts a focus session using the Focus app on macOS.
 * Optionally specify a profile name and/or duration in hours and minutes.
 * If a session is already running, starting a new one will replace it.
 */
export default async function tool(input: Input) {
  if (!(await getInstallStatus())) {
    throw new Error("Focus is not installed. Install it from: https://heyfocus.com");
  }

  const hasProfile = !!input.profile;
  const hasDuration = (input.hours ?? 0) > 0 || (input.minutes ?? 0) > 0;

  if (hasDuration) {
    await startFocusCustom(input.hours, input.minutes, input.profile);
  } else if (hasProfile && input.profile) {
    await startFocusWithProfile(input.profile);
  } else {
    await startFocus();
  }

  const parts = [];
  if (input.profile) parts.push(`profile "${input.profile}"`);
  if (input.hours) parts.push(`${input.hours}h`);
  if (input.minutes) parts.push(`${input.minutes}m`);

  return `Focus session started${parts.length ? ` (${parts.join(", ")})` : ""}.`;
}
