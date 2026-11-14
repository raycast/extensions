import { logger } from "@chrismessina/raycast-logger";
import { listJournals } from "../lib/api";

const log = logger.child("[ai]");

/** Lists the user's Day One journals. */
export default async function tool() {
  const journals = await listJournals();
  log.debug("list-journals", { count: journals.length });
  return journals.map(({ id, name, encrypted }) => ({ id, name, encrypted }));
}
