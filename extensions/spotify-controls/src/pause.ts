import { runAppleScriptSilently } from "./utils";

export default async () => {
  await runAppleScriptSilently('tell application "Spotify" to pause');
};
