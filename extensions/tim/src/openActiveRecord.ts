import { buildScriptEnsuringTimIsRunning, runAppleScriptSilently } from "./utils";

export default async () => {
  const script = buildScriptEnsuringTimIsRunning(`openactiverecord`);
  await runAppleScriptSilently(script);
};
