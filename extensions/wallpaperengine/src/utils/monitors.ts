import { exec } from "child_process";
import { promisify } from "util";
import { MonitorInfo } from "./types";

const execAsync = promisify(exec);

export async function getMonitors(): Promise<MonitorInfo[]> {
  try {
    const { stdout } = await execAsync(
      'powershell -Command "Get-CimInstance Win32_DesktopMonitor | Select-Object DeviceID, Name, ScreenWidth, ScreenHeight | ConvertTo-Json"',
      { encoding: "utf-8" },
    );
    const monitors = JSON.parse(stdout);
    const monitorArray = Array.isArray(monitors) ? monitors : [monitors];

    return monitorArray.map((m: Record<string, unknown>, i: number) => ({
      index: i,
      name: (m.Name as string) || `Monitor ${i}`,
      width: (m.ScreenWidth as number) || 0,
      height: (m.ScreenHeight as number) || 0,
    }));
  } catch {
    return [{ index: 0, name: "Primary Monitor", width: 0, height: 0 }];
  }
}
