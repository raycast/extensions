import { confirmAlert, showHUD } from "@raycast/api";
import { execSync } from "node:child_process";

const commands = {
  mDNSResponder: "sudo killall -HUP mDNSResponder",
  dscacheutil: "sudo dscacheutil -flushcache",
  mdnsflushcache: "sudo discoveryutil mdnsflushcache",
} as const satisfies Record<string, string>;

export default async function main() {
  const osVersion = execSync("sw_vers -productVersion").toString().trim();

  const runCommands: (keyof typeof commands)[] = [];

  if (osVersion.match(/^1[1-3]/)) {
    console.log(`OS Version: ${osVersion} parsed as 11-13`);
    runCommands.push("dscacheutil", "mDNSResponder");
  } else if (osVersion.match(/^10\.([7-9]|1[1-4])/) || osVersion.match(/^10\.10\.[4-5]/)) {
    console.log(`OS Version: ${osVersion} parsed as 10.7-9, 10.10.4-5, 10.11-14`);
    runCommands.push("mDNSResponder");
  } else if (osVersion.match(/^10\.10\.[0-3]/)) {
    console.log(`OS Version: ${osVersion} parsed as 10.10.0-3`);
    runCommands.push("mdnsflushcache");
  } else if (osVersion.startsWith("10.6")) {
    console.log(`OS Version: ${osVersion} parsed as 10.6`);
    runCommands.push("dscacheutil");
  } else {
    const flush = await confirmAlert({
      title: `OS Version ${osVersion} is not supported.`,
      message: "Would you like to try flushing the DNS cache anyway?",
      primaryAction: {
        title: "Flush DNS Cache",
      },
      dismissAction: {
        title: "Cancel",
      },
    });
    if (!flush) return;
    runCommands.push("dscacheutil", "mDNSResponder");
  }

  const command = runCommands.map((key) => commands[key]).join("; ");

  const osaCommand = `osascript -e 'do shell script "${command}" with administrator privileges'`;

  console.log(`Running command: ${osaCommand}`);

  execSync(osaCommand, { shell: "/bin/bash" });

  await showHUD("DNS Cache Flushed");
}
