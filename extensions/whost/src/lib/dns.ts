import { execFileSync } from "child_process";

export function flushDns(): void {
  execFileSync("cmd", ["/c", "ipconfig", "/flushdns"], { windowsHide: true });
}
