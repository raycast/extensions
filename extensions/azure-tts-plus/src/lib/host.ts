/** The seam between Raycast and the reading engine. Only commands import this. */
import { environment, showHUD } from "@raycast/api";
import { getAzureCredentials } from "./prefs.js";
import { Env, startReadingWithControls } from "./reading.js";

export { messageOf } from "./reading.js";

export const hostEnv = (): Env => ({
  assetsDir: environment.assetsPath,
  credentials: getAzureCredentials(),
});

/** Read `text` aloud, with the panel's speed chips and click-to-rewind armed. */
export const speak = async (text: string) => {
  const job = await startReadingWithControls(hostEnv(), text);
  if (job.words.length === 0 && job.text.trim().length > 0) {
    // No word map means no highlight, but the audio is still worth playing.
    await showHUD(
      "Reading without word highlight — the engine returned no word timings",
    );
  }
  return job;
};
