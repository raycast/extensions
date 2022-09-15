import { buildScriptEnsuringTimIsRunning, runAppleScriptSilently } from "./utils";

export default async () => {
  const script = buildScriptEnsuringTimIsRunning(`opentaskmanager`);
  await runAppleScriptSilently(script);
};
