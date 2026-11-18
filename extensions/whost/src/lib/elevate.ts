import { execFileSync } from "child_process";
import { unlinkSync, writeFileSync } from "fs";
import { join } from "path";
import { environment } from "@raycast/api";
import { HOSTS_PATH } from "./types";

/**
 * Writes `content` to the protected hosts file by elevating a PowerShell
 * process via a UAC prompt (RunAs). Blocks until the elevated process exits.
 * Throws if elevation is declined or the copy fails.
 */
export function elevatedWrite(content: string): void {
  const tmp = join(environment.supportPath, "hosts.tmp");
  const script = join(environment.supportPath, "apply-hosts.ps1");

  writeFileSync(tmp, content, "utf8");

  const ps = [
    `$ErrorActionPreference = 'Stop'`,
    `Copy-Item -Path '${tmp.replace(/'/g, "''")}' -Destination '${HOSTS_PATH.replace(/'/g, "''")}' -Force`,
    `Remove-Item -Path '${tmp.replace(/'/g, "''")}' -Force -ErrorAction SilentlyContinue`,
  ].join("\n");

  writeFileSync(script, ps, "utf8");

  try {
    execFileSync(
      "powershell",
      [
        "-Command",
        `$ErrorActionPreference = 'Stop'; $p = Start-Process -FilePath powershell -Verb RunAs -Wait -PassThru -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File "${script.replace(/'/g, "''")}"'; exit $p.ExitCode`,
      ],
      { windowsHide: true },
    );
  } finally {
    for (const file of [tmp, script]) {
      try {
        unlinkSync(file);
      } catch {
        /* ignore */
      }
    }
  }
}
