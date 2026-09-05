import { runBulkCommand } from "./lib/bulkCommand";
import { pullRepo } from "./lib/ops";

export default async function Command() {
  await runBulkCommand("Pulling", pullRepo);
}
