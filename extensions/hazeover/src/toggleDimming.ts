import { runAppleScriptSilently } from "./utils";

export default async () => {
  await runAppleScriptSilently('tell application "HazeOver" to set enabled to not enabled', false);
};
