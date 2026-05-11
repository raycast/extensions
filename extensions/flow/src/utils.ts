import { getApplications } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export type Phase = "Flow" | "Break" | "Long Break";

export async function getCurrentPhase() {
  const phase = await runAppleScript('tell application "Flow" to getPhase');
  return phase as Phase;
}

export async function isFlowInstalled() {
  const applications = await getApplications();
  return applications.some(({ bundleId }) => bundleId === "design.yugen.Flow");
}

export async function pauseTimer() {
  await runAppleScript('tell application "Flow" to stop');
}

export async function showTimer() {
  await runAppleScript('tell application "Flow" to show');
}

export async function hideTimer() {
  await runAppleScript('tell application "Flow" to hide');
}

export async function startTimer() {
  await runAppleScript('tell application "Flow" to start');
}

export async function skipSession() {
  await runAppleScript('tell application "Flow" to skip');
}

export async function resetTimer() {
  await runAppleScript('tell application "Flow" to reset');
}

export async function quitFlow() {
  await runAppleScript('tell application "Flow" to quit');
}

export async function setSessionTitle(title: string) {
  const safeTitle = title.replace(/"/g, '\\"'); // escape double quote titles
  await runAppleScript(`tell application "Flow" to setTitle to "${safeTitle}"`);
}
