import { getFrontmostApplication } from "@raycast/api";
import { act, getState } from "./lib/client";
import { runCommand } from "./lib/ui";

export default async function Command() {
  await runCommand(async () => {
    const app = await getFrontmostApplication();
    if (!app.bundleId) throw new Error("Could not tell which app is in front.");
    const excluded = !(await getState()).excludedApps.includes(app.bundleId);
    await act({ cmd: "exclude", bundleID: app.bundleId, excluded });
    return excluded ? `TalkRemind now ignores ${app.name}` : `TalkRemind reminds you in ${app.name} again`;
  });
}
