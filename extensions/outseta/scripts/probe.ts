// Read-only probe of the Outseta API. Saves raw responses (may contain customer PII)
// to fixtures/raw/, which is gitignored. Never add write requests here.
//
// Usage: create .env with OUTSETA_SUBDOMAIN, OUTSETA_API_KEY, OUTSETA_SECRET_KEY, then
//   node scripts/probe.ts [search-term]

import { mkdirSync, writeFileSync } from "node:fs";

process.loadEnvFile(".env");

const subdomain = process.env.OUTSETA_SUBDOMAIN;
const apiKey = process.env.OUTSETA_API_KEY;
const secretKey = process.env.OUTSETA_SECRET_KEY;
if (!subdomain || !apiKey || !secretKey) {
  throw new Error("Set OUTSETA_SUBDOMAIN, OUTSETA_API_KEY and OUTSETA_SECRET_KEY in .env");
}

const searchTerm = process.argv[2] ?? "a";
const baseUrl = `https://${subdomain}.outseta.com/api/v1`;
const outDir = "fixtures/raw";
mkdirSync(outDir, { recursive: true });

const probes: Record<string, string> = {
  "people-list": "/crm/people?limit=3",
  "people-list-light": "/crm/people?limit=3&fields=Uid,FirstName,LastName,Email,PersonAccount.Account.Name",
  "people-search": `/crm/people?limit=3&q=${encodeURIComponent(searchTerm)}`,
  "person-detail": "", // filled from people-list
  "accounts-list": "/crm/accounts?limit=3&fields=*,CurrentSubscription.*,CurrentSubscription.Plan.*",
  "accounts-search": `/crm/accounts?limit=3&q=${encodeURIComponent(searchTerm)}`,
  plans: "/billing/plans?limit=10",
  "cases-list": "/support/cases?limit=3",
  "cases-search": `/support/cases?limit=3&q=${encodeURIComponent(searchTerm)}`,
  "case-detail": "", // filled from cases-list
};

async function get(path: string) {
  const res = await fetch(baseUrl + path, {
    headers: { Authorization: `Outseta ${apiKey}:${secretKey}`, Accept: "application/json" },
  });
  const headers = Object.fromEntries(res.headers.entries());
  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    // keep raw text
  }
  return { status: res.status, headers, body };
}

function firstUid(body: unknown): string | undefined {
  const items = (body as { items?: { Uid?: string }[] })?.items;
  return items?.[0]?.Uid;
}

async function main() {
  const results: Record<string, Awaited<ReturnType<typeof get>>> = {};
  for (const [name, path] of Object.entries(probes)) {
    let resolved = path;
    if (name === "person-detail") {
      const uid = firstUid(results["people-list"]?.body);
      if (!uid) continue;
      resolved = `/crm/people/${uid}?fields=*,PersonAccount.*,PersonAccount.Account.*,PersonAccount.Account.CurrentSubscription.*,PersonAccount.Account.CurrentSubscription.Plan.*`;
    }
    if (name === "case-detail") {
      const uid = firstUid(results["cases-list"]?.body);
      if (!uid) continue;
      resolved = `/support/cases/${uid}?fields=*,CaseHistories.*,FromPerson.*,AssignedToPerson.*`;
    }

    const result = await get(resolved);
    results[name] = result;
    writeFileSync(`${outDir}/${name}.json`, JSON.stringify({ path: resolved, ...result }, null, 2));
    const count = (result.body as { items?: unknown[] })?.items?.length;
    console.log(`${result.status} ${name}${count === undefined ? "" : ` (${count} items)`}`);
  }

  const rateHeaders = Object.entries(results["people-list"]?.headers ?? {}).filter(([k]) =>
    /rate|limit|retry/i.test(k),
  );
  console.log("rate-limit headers:", rateHeaders.length ? Object.fromEntries(rateHeaders) : "none");
  console.log(`\nSaved to ${outDir}/ (gitignored).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
