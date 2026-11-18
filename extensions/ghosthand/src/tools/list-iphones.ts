import { client } from "../lib/ghosthand-client";
import { listAiPhones } from "../lib/ai-operations";

/** List local iPhones with their exact phoneId, readiness, and current lease holder. */
export default async function tool() {
  return listAiPhones(client);
}
