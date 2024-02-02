import fs from "node:fs";
import util from "node:util";
import { runAppleScript } from "@raycast/utils";

const readFileAsync = util.promisify(fs.readFile);
const writeFileAsync = util.promisify(fs.writeFile);

export async function getCurrentlyBlockedHosts() {
  const data = await readFileAsync("/etc/hosts", "utf8");
  const lines = data.split("\n");
  const matchedLines = lines.filter((line) => line.endsWith("#website-blocker-raycast"));
  const matchedHosts = matchedLines.map((line) => line.split(" ")[1]).filter((host) => host);
  return Array.from(new Set(matchedHosts)); // deduplicate ipv4 / ipv6 lines
}

export async function updateHostsFile(hosts: string[]) {
  const data = await readFileAsync("/etc/hosts", "utf8");
  const lines = data.split("\n");
  const otherLines = lines.filter((line) => !line.endsWith("#website-blocker-raycast"));
  const newLines = [];
  for (const host of hosts) {
    newLines.push(`0.0.0.0 ${host} #website-blocker-raycast`);
    newLines.push(`:: ${host} #website-blocker-raycast`);
    if (host.split(".").length === 2) {
      newLines.push(`0.0.0.0 www.${host} #website-blocker-raycast`);
      newLines.push(`:: www.${host} #website-blocker-raycast`);
    }
  }
  const newContent = [...otherLines, ...newLines, ""].join("\n").replaceAll(/\n{3,}/g, "\n\n");
  await writeFileAsync("/tmp/hosts-website-blocker-raycast", newContent);
  await runAppleScript(
    'do shell script "cp /tmp/hosts-website-blocker-raycast /etc/hosts; sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder" with administrator privileges',
  );
}
