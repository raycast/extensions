import { getApplications, Tool } from "@raycast/api";
import { act } from "../lib/client";
import { findApp } from "../lib/apps";

type Input = {
  /** Name or bundle identifier of an installed app, for example "Mail" or "com.apple.mail". */
  app: string;
  /** True to exclude the app (no reminders, left out of the statistics), false to include it again. */
  excluded: boolean;
};

export const confirmation: Tool.Confirmation<Input> = async ({ app, excluded }) => ({
  message: excluded
    ? `Stop TalkRemind from reminding you in ${app}? The app is also left out of the statistics.`
    : `Let TalkRemind remind you in ${app} again?`,
});

export default async function tool({ app, excluded }: Input) {
  const found = findApp(await getApplications(), app);
  await act({ cmd: "exclude", bundleID: found.bundleId, excluded });
  return excluded ? `${found.name} is now excluded.` : `${found.name} is included again.`;
}
