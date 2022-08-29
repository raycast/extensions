import { buildScriptEnsuringTimIsRunning, runAppleScriptSilently } from "./utils";

export default async () => {
  const script = buildScriptEnsuringTimIsRunning(`opennavigator`);
  await runAppleScriptSilently(script);
};
