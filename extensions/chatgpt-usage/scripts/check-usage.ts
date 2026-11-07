import { resolve } from "node:path";
import { fetchUsage } from "../src/lib/codex";

fetchUsage(process.argv[2] ?? "", resolve("assets/codex-usage-helper"))
  .then((usage) => console.log(JSON.stringify(usage, null, 2)))
  .catch((error: Error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
