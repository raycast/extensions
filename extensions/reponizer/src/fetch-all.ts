import { runBulkCommand } from "./lib/bulkCommand";
import { fetchRepo } from "./lib/ops";

export default async function Command() {
  await runBulkCommand("Fetching", fetchRepo);
}
