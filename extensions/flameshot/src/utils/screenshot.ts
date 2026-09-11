import { getPreferenceValues } from "@raycast/api";
import { countdown, execp, getCliPath, isWin, preferences } from "./helpers";

const cliPath = getCliPath();
const screenshotsFolder = preferences.screenshotsFolder;

const captureScreenPreferences = getPreferenceValues<Preferences.CaptureScreen>();
const captureSelectionPreferences = getPreferenceValues<Preferences.CaptureSelection>();
const captureAllScreensPreferences = getPreferenceValues<Preferences.CaptureAllScreens>();

const captureScreenDelay = Number(captureScreenPreferences.delay);
const captureSelectionDelay = Number(captureSelectionPreferences.delay);
const captureAllScreensDelay = Number(captureAllScreensPreferences.delay);

const captureScreenCountdown = Boolean(captureScreenPreferences.countdown);
const captureSelectionCountdown = Boolean(captureSelectionPreferences.countdown);
const captureAllScreensCountdown = Boolean(captureAllScreensPreferences.countdown);

const captureSelectionAcceptOnSelect = captureSelectionPreferences.acceptOnSelect;
const captureSelectionPin = captureSelectionPreferences.pin;

function parseScreenshotPath(stderr: string): string | null {
  const path = stderr.split("as ")[1]?.trim();

  return path ? (isWin ? path.replace(/\//g, "\\") : path) : null;
}

export async function screen(delay: number): Promise<string | null> {
  await countdown(delay || captureScreenDelay, captureScreenCountdown);

  const res = await execp(cliPath, ["screen", "-n", "0", "-p", screenshotsFolder]);

  return parseScreenshotPath(res.stderr);
}

export async function selection(delay: number, pin: boolean): Promise<string | null> {
  await countdown(delay || captureSelectionDelay, captureSelectionCountdown);

  const res = await execp(cliPath, [
    "gui",
    "-p",
    screenshotsFolder,
    ...(captureSelectionAcceptOnSelect ? ["-s"] : []),
    ...(pin || captureSelectionPin ? ["--pin"] : []),
  ]);

  return parseScreenshotPath(res.stderr);
}

export async function allScreens(delay: number): Promise<string | null> {
  await countdown(delay || captureAllScreensDelay, captureAllScreensCountdown);

  const res = await execp(cliPath, ["full", "-p", screenshotsFolder]);

  return parseScreenshotPath(res.stderr);
}
