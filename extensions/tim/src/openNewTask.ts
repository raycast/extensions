import { buildScriptEnsuringTimIsRunning, runAppleScriptSilently } from "./utils";

export default async () => {
  const script = buildScriptEnsuringTimIsRunning(`opennewtask`);
  await runAppleScriptSilently(script);
};
