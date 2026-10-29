import { join } from "node:path";
import { Paths } from "./paths";

// launchd runs Node directly; XML escaping preserves paths without shell interpretation.
export const AGENT_LABEL = "com.sushil.local-content-search";
const HOST_MEMORY_MB = 512;
function xml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
export function launchAgent(node: string, locations: Paths): string {
  // The small host serves user-initiated queries. Index workers apply their own utility clamp and memory budget.
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>${AGENT_LABEL}</string>
<key>ProgramArguments</key><array><string>/usr/sbin/taskpolicy</string><string>-m</string><string>${HOST_MEMORY_MB}</string><string>${xml(node)}</string><string>${xml(locations.daemon)}</string></array>
<key>EnvironmentVariables</key><dict><key>LOCAL_SEARCH_HOME</key><string>${xml(locations.base)}</string></dict>
<key>RunAtLoad</key><true/>
<key>KeepAlive</key><dict><key>SuccessfulExit</key><false/></dict>
<key>ThrottleInterval</key><integer>30</integer>
<key>ProcessType</key><string>Interactive</string>
<key>StandardOutPath</key><string>${xml(join(locations.logs, "service.log"))}</string>
<key>StandardErrorPath</key><string>${xml(join(locations.logs, "error.log"))}</string>
</dict></plist>
`;
}
