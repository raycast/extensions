import { closeMainWindow, showHUD } from "@raycast/api";
import { hubstaff, ensureHubstaffInstalled } from "./shared";

export default async function Command() {
  try {
    ensureHubstaffInstalled();
  } catch {
    await showHUD("Hubstaff is not installed");
    return;
  }
  await closeMainWindow();

  // Try stop first — one CLI call if timer is running
  const stopResult = hubstaff(["stop"]);
  try {
    const res = JSON.parse(stopResult);
    if (res.status && res.status.includes("Stopped")) {
      await showHUD("Hubstaff: Stopped");
      return;
    }
  } catch {
    // not JSON or unexpected — fall through to resume
  }

  // Timer wasn't running — resume
  const resumeResult = hubstaff(["resume"]);
  try {
    const res = JSON.parse(resumeResult);
    if (res.error) {
      await showHUD(`Hubstaff: ${res.error}`);
    } else {
      await showHUD("Hubstaff: Started");
    }
  } catch {
    await showHUD(`Hubstaff: ${resumeResult}`);
  }
}