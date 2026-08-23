import { getPreferenceValues } from "@raycast/api";
import { countdown, execp, getCliPath, preferences } from "./helpers";

const cliPath = getCliPath();
const screenshotsFolder = preferences.screenshotsFolder;

const captureScreenPreferences = getPreferenceValues<Preferences.CaptureScreen>();
const captureSelectionPreferences = getPreferenceValues<Preferences.CaptureSelection>();
const captureAllScreensPreferences = getPreferenceValues<Preferences.CaptureAllScreens>();

const captureScreenDelay = Number(captureScreenPreferences.delay);
const captureSelectionDelay = Number(captureSelectionPreferences.delay);
const captureAllScreensDelay = Number(captureAllScreensPreferences.delay);

const captureScreenCountdown = Number(captureScreenPreferences.countdown);
const captureSelectionCountdown = Number(captureSelectionPreferences.countdown);
const captureAllScreensCountdown = Number(captureAllScreensPreferences.countdown);

const captureSelectionAcceptOnSelect = captureSelectionPreferences.acceptOnSelect;
const captureSelectionPin = captureSelectionPreferences.pin;

export async function screen(delay: number): Promise<string | null> {
  if (captureScreenCountdown) await countdown(delay ? delay : captureScreenDelay);

  const res = await execp(`${cliPath} screen -n 0 -p "${screenshotsFolder}"`);

  const path = res.stderr.split("as ")[1]?.trim();

  return path ? path.replace(/\//g, "\\") : null;
}

export async function selection(delay: number, pin: boolean): Promise<string | null> {
  if (captureSelectionCountdown) await countdown(delay ? delay : captureSelectionDelay);

  const res = await execp(
    `${cliPath} gui -p "${screenshotsFolder}"${captureSelectionAcceptOnSelect ? " -s" : ""}${pin ? " --pin" : captureSelectionPin ? " --pin" : ""}`,
  );

  const path = res.stderr.split("as ")[1]?.trim();

  return path ? path.replace(/\//g, "\\") : null;
}

export async function allScreens(delay: number): Promise<string | null> {
  if (captureAllScreensCountdown) await countdown(delay ? delay : captureAllScreensDelay);

  const res = await execp(`${cliPath} full -p ${screenshotsFolder}`);

  const path = res.stderr.split("as ")[1]?.trim();

  return path ? path.replace(/\//g, "\\") : null;
}
