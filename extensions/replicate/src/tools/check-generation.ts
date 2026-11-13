import { generationResult } from "../lib/generation";
import { getPrediction, waitForPrediction } from "../lib/replicate";

type Input = {
  /**
   * The id start-generation returned.
   */
  id: string;
};

// Short enough that checks show as steps in the chat, long enough for fast models.
const CHECK_TIMEOUT_MS = 10_000;
const CHECK_POLL_MS = 1000;

/**
 * Check on an image started with start-generation, waiting up to ten seconds for it to finish.
 */
export default async function tool({ id }: Input) {
  return generationResult(
    await waitForPrediction(await getPrediction(id), { interval: CHECK_POLL_MS, timeout: CHECK_TIMEOUT_MS }),
  );
}
