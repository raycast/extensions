import { Application, getPreferenceValues } from "@raycast/api";
import { ExecuteCustomCommand } from "./types";
import { openBrowserTab } from "./run-applescript";

export default async function main(props: ExecuteCustomCommand) {
  const browser = getPreferenceValues<{ browser: Application }>().browser;
  await openBrowserTab({
    browserName: browser.name,
    prompt: props.arguments.prompt,
    gptUrl: props.arguments.gptUrl,
    query: props.arguments.query,
  });
  return null;
}
