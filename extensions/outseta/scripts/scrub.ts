// Turns raw API responses in fixtures/raw/ (gitignored, real customer data) into committed
// fixtures in fixtures/ with every identifying string replaced by a fake one.
//
// Allowlist approach: a string survives only if it is a date, an empty string, or sits under a
// key known to be non-identifying. Everything else is replaced. Uids and Stripe ids map to the
// same fake value everywhere, so references between fixtures stay consistent.
//
// Usage: node scripts/scrub.ts

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";

const rawDir = "fixtures/raw";
const outDir = "fixtures";
const skip = new Set(["reply-test.json"]);

const keepKeys = new Set([
  "_objectType",
  "AccountStageLabel",
  "Currency",
  "Timezone",
  "Language",
  "UnitOfMeasure",
  "StripePriceIds",
]);
// Plan names are the account owner's own product catalogue, not customer data. Descriptions are
// faked anyway since they can name the business.
const keepKeysInPlan = new Set(["Name"]);

const datePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z?$/;
const firstNames = ["Ada", "Grace", "Alan", "Edsger", "Barbara", "Donald", "Frances", "Ken", "Radia", "Linus"];
const lastNames = ["Lovelace", "Hopper", "Turing", "Dijkstra", "Liskov", "Knuth", "Allen", "Thompson", "Perlman"];

const idMap = new Map<string, string>();
let personCounter = 0;
let stringCounter = 0;

function fakeId(real: string, prefix = "") {
  let fake = idMap.get(real);
  if (!fake) {
    fake = `${prefix}fake${String(idMap.size + 1).padStart(4, "0")}`;
    idMap.set(real, fake);
  }
  return fake;
}

function fakeString(key: string, value: string): string {
  const n = personCounter++;
  const first = firstNames[n % firstNames.length] ?? "Ada";
  const last = lastNames[n % lastNames.length] ?? "Lovelace";

  if (key === "Uid" || key.endsWith("Identifier") || key.endsWith("Uid")) return fakeId(value);
  if (/^(cus|sub|pm|in|price|prod)_/.test(value)) return fakeId(value, value.split("_")[0] + "_");
  if (key.endsWith("Id")) return fakeId(value);
  if (key === "Email" || key === "PersonEmail" || value.includes("@")) {
    return `${first.toLowerCase()}.${last.toLowerCase()}@example.com`;
  }
  if (key === "FirstName") return first;
  if (key === "LastName") return last;
  if (key === "FullName" || key === "AgentName") return `${first} ${last}`;
  if (key === "Name") return `${last} & Co`;
  if (key === "Comment" || key === "Body") return "<p>Sample message.</p>";
  if (key === "Subject") return "Sample subject";
  if (key.startsWith("Phone")) return "+1 555 0100";
  if (key === "IPAddress") return "192.0.2.1";
  if (/Url\d*$/.test(key)) return "https://example.com/";
  return `redacted-${++stringCounter}`;
}

function scrub(value: unknown, key = "", parentType = ""): unknown {
  if (Array.isArray(value)) return value.map((item) => scrub(item, key, parentType));
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const type = typeof record._objectType === "string" ? record._objectType : parentType;
    return Object.fromEntries(Object.entries(record).map(([k, v]) => [k, scrub(v, k, type)]));
  }
  if (typeof value !== "string" || value === "") return value;
  if (keepKeys.has(key) || datePattern.test(value)) return value;
  if (parentType === "Plan" && keepKeysInPlan.has(key)) return value;
  return fakeString(key, value);
}

mkdirSync(outDir, { recursive: true });
for (const file of readdirSync(rawDir).filter((f) => f.endsWith(".json") && !skip.has(f))) {
  const raw = JSON.parse(readFileSync(`${rawDir}/${file}`, "utf8")) as { body: unknown };
  writeFileSync(`${outDir}/${file}`, JSON.stringify(scrub(raw.body), null, 2) + "\n");
  console.log(`scrubbed ${file}`);
}
