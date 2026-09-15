// Fetches the Attio OpenAPI spec into a committed snapshot with a recorded hash.
// Run manually via `npm run types:fetch` when refreshing; never at build time.
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";

(async () => {
  const res = await fetch("https://api.attio.com/openapi/api");
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  const text = await res.text();
  JSON.parse(text); // sanity: must be valid JSON
  writeFileSync("scripts/attio-openapi.json", text);
  writeFileSync("scripts/attio-openapi.sha256", createHash("sha256").update(text).digest("hex") + "\n");
  console.log("snapshot written:", text.length, "bytes");
})();
