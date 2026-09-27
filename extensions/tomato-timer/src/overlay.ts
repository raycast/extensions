import { environment } from "@raycast/api";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { Active, supportFile } from "./storage";

// The floating timer is a small WPF window run by Windows PowerShell. It also
// fires the end-of-session notification and sound, so it runs (hidden) even when
// the floating timer is turned off. It watches active.json and exits by itself
// when the session is stopped or replaced, so the view never kills processes.

function beatIsFresh(id: string) {
  try {
    const [beatId, , ms] = fs.readFileSync(supportFile("overlay.beat"), "utf8").trim().split("|");
    return beatId === id && Date.now() - Number(ms) < 2500;
  } catch {
    return false;
  }
}

export function ensureOverlay(a: Active | null, force = false) {
  if (!a || a.stoppedAt) return;
  if (!force && beatIsFresh(a.id)) return;
  // Claim the heartbeat right away so a second call in the same second does not launch twice.
  fs.writeFileSync(supportFile("overlay.beat"), `${a.id}|0|${Date.now()}`);
  const script = path.join(environment.assetsPath, "overlay.ps1");
  const dir = environment.supportPath;
  // The `start` hop detaches the process from Raycast's extension host, which
  // otherwise ends child processes when the command closes.
  const command = `start "" /min powershell.exe -STA -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "${script}" -Dir "${dir}" -Id ${a.id}`;
  spawn("cmd.exe", ["/d", "/s", "/c", `"${command}"`], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
    windowsVerbatimArguments: true,
  }).unref();
}
