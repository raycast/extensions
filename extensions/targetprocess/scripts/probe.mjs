#!/usr/bin/env node
/**
 * Targetprocess instance probe.
 *
 * Answers the questions the extension's API layer is designed around, without
 * the operator ever having to share their token:
 *
 *   1. Which auth transport does this instance accept (Bearer vs access_token)?
 *   2. What does /api/v1/Context return, and where is the logged-in user in it?
 *   3. Does the Assignables base collection exist, or must we fan out per type?
 *   4. Is API v2 available?
 *   5. What is the browser URL format for an entity?
 *
 * Output is structural only: key names, value types, HTTP statuses, counts.
 * Entity names, descriptions and every other piece of content are redacted.
 * Workflow state names are included because the UI groups by them - pass
 * --strict to redact those too.
 *
 * Usage:  node scripts/probe.mjs [--strict]
 * Reads TP_URL and TP_TOKEN from .env.local (gitignored).
 */

import { readFileSync } from "node:fs";

const STRICT = process.argv.includes("--strict");
const ASSIGNABLE_TYPES = ["UserStory", "Bug", "Task", "Feature", "Epic", "Request"];

/** Collection names are not naive pluralisations - UserStory lives at /UserStories. */
const COLLECTIONS = {
  UserStory: "UserStories",
  Bug: "Bugs",
  Task: "Tasks",
  Feature: "Features",
  Epic: "Epics",
  Request: "Requests",
};

/* ------------------------------------------------------------------ env --- */

function loadEnv(path = ".env.local") {
  let raw;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    fail(`Could not read ${path}. Copy .env.local.example to .env.local and fill it in.`);
  }
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

/** Thrown to unwind to the top level; process.exit() mid-request crashes libuv on Windows. */
class ProbeExit extends Error {}

function fail(message) {
  console.error(`\n  ${message}\n`);
  process.exitCode = 1;
  throw new ProbeExit(message);
}

/** Strip trailing slashes but preserve any path prefix (on-prem installs). */
function normaliseBaseUrl(input) {
  const trimmed = String(input || "")
    .trim()
    .replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(trimmed)) fail(`TP_URL must start with http:// or https:// (got "${trimmed}")`);
  return trimmed;
}

/* -------------------------------------------------------------- redaction - */

let TOKEN = "";

/** Defence in depth: the token must never reach stdout, whatever happens. */
function scrub(text) {
  const string = typeof text === "string" ? text : JSON.stringify(text);
  return TOKEN ? string.split(TOKEN).join("<token>") : string;
}

/**
 * Describe a value's shape without disclosing its content.
 * Returns key names mapped to type names, recursing a couple of levels.
 */
function shape(value, depth = 2) {
  if (value === null) return "null";
  if (Array.isArray(value)) {
    return depth <= 0 || value.length === 0 ? `array(${value.length})` : [shape(value[0], depth - 1)];
  }
  if (typeof value !== "object") return typeof value;
  if (depth <= 0) return "object";
  const out = {};
  for (const [key, inner] of Object.entries(value)) out[key] = shape(inner, depth - 1);
  return out;
}

/* ------------------------------------------------------------------ http -- */

const results = [];

/** undici hides the real reason behind a bare "fetch failed" - walk the cause chain. */
function describeError(error) {
  const parts = [];
  for (let current = error, depth = 0; current && depth < 4; current = current.cause, depth++) {
    const part = current.code || current.message;
    if (part && !parts.includes(part)) parts.push(part);
  }
  return parts.join(" <- ") || "unknown";
}

async function request(label, url, { transport = "bearer", redirect = "manual" } = {}) {
  const target = new URL(url);
  const headers = { Accept: "application/json" };
  if (transport === "bearer") headers.Authorization = `Bearer ${TOKEN}`;
  if (transport === "basic") headers.Authorization = `Basic ${Buffer.from(`${TOKEN}:`).toString("base64")}`;
  if (transport === "query") target.searchParams.set("access_token", TOKEN);

  const started = Date.now();
  try {
    const response = await fetch(target, { headers, redirect });
    const ms = Date.now() - started;
    const contentType = response.headers.get("content-type") || "";
    let body = null;
    if (contentType.includes("json")) {
      body = await response.json().catch(() => null);
    } else {
      await response.arrayBuffer().catch(() => null);
    }
    const entry = { label, status: response.status, ms, contentType: contentType.split(";")[0], body };
    const location = response.headers.get("location");
    if (redirect === "manual" && location) entry.location = location;

    // Anything that tells us we are being throttled rather than refused.
    if (response.status !== 200) {
      const hints = {};
      for (const header of ["retry-after", "x-ratelimit-limit", "x-ratelimit-remaining", "x-ratelimit-reset"]) {
        const value = response.headers.get(header);
        if (value) hints[header] = value;
      }
      if (Object.keys(hints).length > 0) entry.hints = hints;
    }
    results.push(entry);
    return entry;
  } catch (error) {
    const entry = { label, status: 0, ms: Date.now() - started, error: describeError(error) };
    results.push(entry);
    return entry;
  }
}

function line(label, verdict, detail = "") {
  const status = verdict === true ? "PASS" : verdict === false ? "FAIL" : verdict;
  console.log(`  ${String(status).padEnd(6)} ${label}${detail ? ` - ${detail}` : ""}`);
}

/* ----------------------------------------------------------------- probes - */

async function main() {
  const env = loadEnv();
  TOKEN = env.TP_TOKEN || "";
  if (!TOKEN) fail("TP_TOKEN is empty in .env.local");
  const base = normaliseBaseUrl(env.TP_URL);
  const parsed = new URL(base);

  console.log(`\nTargetprocess probe`);
  console.log(`  host: ${parsed.host}`);
  console.log(`  path prefix: ${parsed.pathname === "/" ? "(none)" : parsed.pathname}`);
  console.log(`  redaction: ${STRICT ? "strict (state names hidden)" : "standard (state names shown)"}\n`);

  /* 1. Auth transport ----------------------------------------------------- */
  console.log("1. Authentication");

  // Open a connection first so a cold TLS handshake cannot be misread as the
  // instance rejecting a header. Transport verdicts must come from HTTP status
  // codes, never from a transport-level failure on the first request.
  await request("warmup", `${base}/api/v1/Context?format=json`, { transport: "none" });

  const contextUrl = `${base}/api/v1/Context?format=json`;
  const variants = [
    ["bearer", "Bearer header"],
    ["basic", "Basic header (token as username)"],
    ["query", "access_token query param"],
  ];

  let transport = null;
  const attempts = new Map();
  for (const [name, label] of variants) {
    // Two attempts: a lone transport failure is a flake, twice is a finding.
    let entry = await request(`context/${name}`, contextUrl, { transport: name });
    if (entry.status === 0) entry = await request(`context/${name}/retry`, contextUrl, { transport: name });
    attempts.set(name, entry);
    const detail = entry.status === 0 ? `unreachable (${entry.error})` : `HTTP ${entry.status} in ${entry.ms}ms`;
    line(label, entry.status === 200, detail);
    if (entry.status === 200 && !transport) transport = name;
  }

  if (!transport) {
    // The extension must tell these apart too - unreachable and unauthorised
    // need different copy (see ADR-0005), so the probe models the distinction.
    const statuses = [...attempts.values()].map((entry) => entry.status);
    if (statuses.every((status) => status === 0)) {
      fail(`Could not reach ${parsed.host}. Check the URL, your connection, and any VPN requirement.`);
    }
    if (statuses.some((status) => status === 401 || status === 403)) {
      fail("Reached the instance but the token was rejected. Check that the PAT is still valid.");
    }
    fail(`Reached ${parsed.host} but /api/v1/Context did not respond as Targetprocess. Check the URL, including any path prefix.`);
  }

  if (transport !== "bearer") {
    console.log(`  note: falling back to the ${transport} transport - Bearer did not authenticate`);
  }

  const context = attempts.get(transport)?.body ?? {};

  /* 2. Context shape ------------------------------------------------------ */
  console.log("\n2. /api/v1/Context");
  console.log(`  top-level keys: ${Object.keys(context).join(", ") || "(none)"}`);
  const user = context.LoggedUser || context.loggedUser || null;
  if (user) {
    console.log(`  LoggedUser shape: ${scrub(JSON.stringify(shape(user, 1)))}`);
    line("logged-in user resolvable", true, `Id is ${typeof user.Id}`);
  } else {
    line("logged-in user resolvable", false, "no LoggedUser key - see top-level keys above");
  }
  if (context.Acid) console.log(`  Acid present: yes (${typeof context.Acid})`);

  const userId = user?.Id;

  /* 3. Assignables base collection ---------------------------------------- */
  console.log("\n3. Assignables base collection");
  // The row's own ResourceType is the base type, so the concrete type has to
  // come from EntityType[Name]; NumericPriority is what orders the sections.
  const include = "[Id,Name,EntityType[Name],EntityState[Name,NumericPriority,IsFinal],Project[Name],ModifyDate]";
  const assignables = await request("assignables", `${base}/api/v1/Assignables?format=json&take=1&include=${include}`, {
    transport,
  });
  if (assignables.status === 200) {
    line("GET /api/v1/Assignables", true, `HTTP 200 in ${assignables.ms}ms`);
    const item = assignables.body?.Items?.[0];
    if (item) {
      console.log(`  row shape: ${scrub(JSON.stringify(shape(item, 2)))}`);
      console.log(`  ResourceType value: ${item.ResourceType ?? "(absent)"}`);
      console.log(`  EntityType.Name: ${item.EntityType?.Name ?? "(absent - concrete type not resolvable from this row)"}`);
      console.log(`  EntityState.IsFinal present: ${item.EntityState?.IsFinal === undefined ? "no" : "yes"}`);
      if (!STRICT && item.EntityState?.Name) console.log(`  sample state name: ${item.EntityState.Name}`);
    } else {
      console.log("  (no items returned - collection is empty or filtered)");
    }
  } else {
    line("GET /api/v1/Assignables", false, `HTTP ${assignables.status} - fan-out fallback required`);
  }

  /* 3b. Filter dialect ----------------------------------------------------- */
  // Which literal syntax the v1 filter DSL accepts decides how a search term is
  // escaped, and how "hide closed items" is expressed. Guessing either would put
  // user input straight into a query language.
  console.log("\n3b. Filter dialect");
  const sampleRow = assignables.body?.Items?.[0];
  console.log(`  ModifyDate raw format: ${sampleRow?.ModifyDate ?? "(absent)"}`);

  const clauses = [
    ["name contains, single quotes", "(Name contains 'a')"],
    ["name contains, double quotes", `(Name contains "a")`],
    ["escaped single quote", "(Name contains 'it\\'s')"],
    ["doubled single quote", "(Name contains 'it''s')"],
    ["IsFinal eq false", "(EntityState.IsFinal eq false)"],
    ["IsFinal eq 'false'", "(EntityState.IsFinal eq 'false')"],
    // The first "combined and" test failed with the unquoted literal in it, which
    // told us nothing about whether `and` works. These separate the two.
    ["and of two trivial clauses", "(Id gt 0) and (Id gt 0)"],
    ["combined and, quoted false", "(Name contains 'a') and (EntityState.IsFinal eq 'false')"],
    ["combined and, outer parens", "((Name contains 'a') and (EntityState.IsFinal eq 'false'))"],
    ["entity type filter", "(EntityType.Name eq 'UserStory')"],
  ];
  for (const [name, where] of clauses) {
    const entry = await request(
      `clause/${name}`,
      `${base}/api/v1/Assignables?format=json&take=1&where=${encodeURIComponent(where)}`,
      { transport },
    );
    const detail = entry.status === 200 ? `HTTP 200, items: ${entry.body?.Items?.length ?? 0}` : `HTTP ${entry.status}`;
    line(name, entry.status === 200, detail);
  }

  /* 3c. Fetching one item by id -------------------------------------------- */
  // Search resolves a numeric query to a single entity. Which of these actually
  // works decides how: a path lookup on the base collection is the obvious
  // shape, but base types do not always support one.
  console.log("\n3c. Single entity by id");
  const probeId = assignables.body?.Items?.[0]?.Id;
  if (probeId == null) {
    line("by id", "SKIP", "no sample entity id available");
  } else {
    const byId = [
      ["path on base collection", `/api/v1/Assignables/${probeId}?format=json`],
      ["path with include", `/api/v1/Assignables/${probeId}?format=json&include=${encodeURIComponent(include)}`],
      [
        "collection filtered by id",
        `/api/v1/Assignables?format=json&take=1&where=${encodeURIComponent(`(Id eq ${probeId})`)}&include=${encodeURIComponent(include)}`,
      ],
      ["path on concrete type", `/api/v1/UserStories/${probeId}?format=json`],
    ];
    for (const [name, path] of byId) {
      const entry = await request(`byid/${name}`, `${base}${path}`, { transport });
      const items = entry.body?.Items;
      const found = Array.isArray(items) ? `items: ${items.length}` : entry.body?.Id ? "single entity" : "no entity";
      line(name, entry.status === 200, `HTTP ${entry.status}${entry.status === 200 ? `, ${found}` : ""}`);
    }
  }

  /* 3d. Identifying an out-of-scope id --------------------------------------- */
  // Searching an ID that belongs to a Release, Project or Iteration currently
  // returns silence. General is the base type above Assignable, so if it can be
  // queried we can at least say what the ID is and offer to open it.
  console.log("\n3d. Non-assignable entities");
  const generalInclude = "[Id,Name,EntityType[Name],EntityState[Name,NumericPriority,IsFinal],Project[Name],ModifyDate]";
  const typeList = "['UserStory','Bug']";
  const generalChecks = [
    ["Generals collection", `/api/v1/Generals?format=json&take=1&include=${encodeURIComponent(generalInclude)}`],
    [
      "Generals by id",
      `/api/v1/Generals?format=json&take=1&where=${encodeURIComponent(`(Id eq ${probeId ?? 1})`)}&include=${encodeURIComponent(generalInclude)}`,
    ],
    [
      "Generals name contains",
      `/api/v1/Generals?format=json&take=1&where=${encodeURIComponent("(Name contains 'a')")}`,
    ],
    [
      "in operator on Generals",
      `/api/v1/Generals?format=json&take=1&where=${encodeURIComponent(`(EntityType.Name in ${typeList})`)}`,
    ],
    [
      "in operator on Assignables",
      `/api/v1/Assignables?format=json&take=1&where=${encodeURIComponent(`(EntityType.Name in ${typeList})`)}`,
    ],
    // Releases and Projects have no EntityState. If the final-state clause
    // excludes stateless entities, it cannot be applied to a General search.
    [
      "Generals with IsFinal clause",
      `/api/v1/Generals?format=json&take=1&where=${encodeURIComponent("(EntityType.Name eq 'Release') and (EntityState.IsFinal eq 'false')")}`,
    ],
    [
      "Generals, Releases only",
      `/api/v1/Generals?format=json&take=1&where=${encodeURIComponent("(EntityType.Name eq 'Release')")}`,
    ],
    ["Releases collection", "/api/v1/Releases?format=json&take=1"],
  ];
  for (const [name, path] of generalChecks) {
    const entry = await request(`general/${name}`, `${base}${path}`, { transport });
    const first = entry.body?.Items?.[0];
    const detail =
      entry.status === 200
        ? `HTTP 200, EntityType.Name: ${first?.EntityType?.Name ?? "(absent)"}`
        : `HTTP ${entry.status}`;
    line(name, entry.status === 200, detail);
  }

  // Which types actually turn up in General decides what the filter list should
  // offer, and how much noise widening search would introduce. Type names are
  // configuration, not content.
  const sample = await request(
    "general/sample",
    `${base}/api/v1/Generals?format=json&take=100&include=${encodeURIComponent("[Id,EntityType[Name]]")}`,
    { transport },
  );
  if (sample.status === 200) {
    const counts = new Map();
    for (const row of sample.body?.Items ?? []) {
      const name = row?.EntityType?.Name ?? "(none)";
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    const summary = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => `${name} x${count}`)
      .join(", ");
    console.log(`  types in a 100-row sample: ${summary || "(none)"}`);
  }

  /* 3e. What General accepts ------------------------------------------------ */
  // The earlier General failures all carried a projection with EntityState and
  // Project in it. Not every entity has those, so the include is the suspect.
  // This finds the largest one that works, since it decides what a row can show.
  console.log("\n3e. General projection");
  const includeCandidates = [
    "[Id,Name]",
    "[Id,Name,EntityType[Name]]",
    "[Id,Name,EntityType[Name],ModifyDate]",
    "[Id,Name,EntityType[Name],ModifyDate,Project[Name]]",
    "[Id,Name,EntityType[Name],ModifyDate,EntityState[Name,NumericPriority,IsFinal]]",
    include,
  ];
  for (const candidate of includeCandidates) {
    const entry = await request(
      `include/${candidate}`,
      `${base}/api/v1/Generals?format=json&take=1&include=${encodeURIComponent(candidate)}`,
      { transport },
    );
    const row = entry.body?.Items?.[0];
    const detail = entry.status === 200 ? `HTTP 200, fields: ${row ? Object.keys(row).join(",") : "(none)"}` : `HTTP ${entry.status}`;
    line(candidate, entry.status === 200, detail);
  }

  /* 3f. Type filtering without an `in` operator ------------------------------ */
  console.log("\n3f. Or-chains for type filtering");
  const orForms = [
    ["bare or", "(EntityType.Name eq 'UserStory') or (EntityType.Name eq 'Bug')"],
    ["wrapped or", "((EntityType.Name eq 'UserStory') or (EntityType.Name eq 'Bug'))"],
    ["and + wrapped or", "(Name contains 'a') and ((EntityType.Name eq 'UserStory') or (EntityType.Name eq 'Bug'))"],
    ["and + bare or", "(Name contains 'a') and (EntityType.Name eq 'UserStory') or (EntityType.Name eq 'Bug')"],
    ["name and type on General", "(Name contains 'a') and (EntityType.Name eq 'Release')"],
  ];
  for (const [name, where] of orForms) {
    const collection = name.includes("General") ? "Generals" : "Assignables";
    const entry = await request(
      `or/${name}`,
      `${base}/api/v1/${collection}?format=json&take=1&where=${encodeURIComponent(where)}`,
      { transport },
    );
    const detail = entry.status === 200 ? `HTTP 200, items: ${entry.body?.Items?.length ?? 0}` : `HTTP ${entry.status}`;
    line(`${collection}: ${name}`, entry.status === 200, detail);
  }

  /* 3g. Entity type metadata ------------------------------------------------ */
  // Does the instance tell us what its entity types are called, and whether it
  // knows their icon or colour? If it does, the type catalogue and the row icons
  // can follow the instance instead of a list hardcoded from documentation.
  console.log("\n3g. Entity type metadata");
  const typeMeta = await request("entitytypes", `${base}/api/v1/EntityTypes?format=json&take=100`, { transport });
  if (typeMeta.status === 200) {
    const items = typeMeta.body?.Items ?? [];
    line("GET /api/v1/EntityTypes", true, `HTTP 200, ${items.length} types`);
    const first = items[0];
    if (first) console.log(`  fields on a type: ${Object.keys(first).join(", ")}`);
    // Type names are configuration, not content.
    console.log(`  types: ${items.map((item) => item?.Name).filter(Boolean).join(", ")}`);
  } else {
    line("GET /api/v1/EntityTypes", false, `HTTP ${typeMeta.status}`);
  }

  const typeMetaV2 = await request(
    "entitytypes/v2",
    `${base}/api/v2/EntityType?take=5&select=${encodeURIComponent("{id,name}")}`,
    { transport },
  );
  line("GET /api/v2/EntityType", typeMetaV2.status === 200, `HTTP ${typeMetaV2.status}`);

  /* 3h. Rate limiting -------------------------------------------------------- */
  // Intermittent 401s that clear on retry look like throttling rather than a bad
  // token. This fires a burst the way fast typing does and reports what comes
  // back, including whether a rejected request carries a Retry-After.
  console.log("\n3h. Behaviour under a burst");
  const burstUrl = `${base}/api/v1/Assignables?format=json&take=1`;
  const burst = await Promise.all(
    Array.from({ length: 20 }, (_, index) => request(`burst/${index}`, burstUrl, { transport })),
  );
  const statuses = new Map();
  for (const entry of burst) statuses.set(entry.status, (statuses.get(entry.status) ?? 0) + 1);
  const spread = [...statuses.entries()].map(([status, count]) => `${status} x${count}`).join(", ");
  const slowest = Math.max(...burst.map((entry) => entry.ms));
  line("20 concurrent requests", [...statuses.keys()].every((status) => status === 200), `${spread}, slowest ${slowest}ms`);

  const rejected = burst.find((entry) => entry.status === 401 || entry.status === 403 || entry.status === 429);
  if (rejected) {
    console.log(`  a rejected response came back as HTTP ${rejected.status} after ${rejected.ms}ms`);
    if (rejected.hints) console.log(`  rate limit headers: ${JSON.stringify(rejected.hints)}`);
    console.log("  if this is throttling, the client should back off rather than re-authenticate");
  }

  // The same volume spread out, to separate "too many at once" from "too many".
  let sequentialBad = 0;
  for (let index = 0; index < 10; index++) {
    const entry = await request(`paced/${index}`, burstUrl, { transport });
    if (entry.status !== 200) sequentialBad += 1;
  }
  line("10 paced requests", sequentialBad === 0, sequentialBad === 0 ? "all 200" : `${sequentialBad} rejected`);

  /* 4. Per-type fallback sanity ------------------------------------------- */
  console.log("\n4. Per-type collections (fan-out fallback)");
  for (const type of ASSIGNABLE_TYPES) {
    const collection = COLLECTIONS[type];
    const entry = await request(`type/${type}`, `${base}/api/v1/${collection}?format=json&take=1`, { transport });
    line(`/api/v1/${collection}`, entry.status === 200, `HTTP ${entry.status}`);
  }

  /* 5. Assigned-to-me filter ---------------------------------------------- */
  console.log("\n5. Assigned-to-me filter");
  if (userId == null) {
    line("assignment filter", "SKIP", "no user id from Context");
  } else {
    const filters = [
      ["AssignedUser.Id", `(AssignedUser.Id eq ${userId})`],
      ["AssignedUser.Where", `(AssignedUser.Where(Id eq ${userId}))`],
      ["Assignments", `(Assignments.Where(GeneralUser.Id eq ${userId}))`],
      // What My Work will actually send.
      ["assigned and not final", `(AssignedUser.Id eq ${userId}) and (EntityState.IsFinal eq 'false')`],
    ];
    for (const [name, where] of filters) {
      const entry = await request(
        `filter/${name}`,
        `${base}/api/v1/Assignables?format=json&take=1&where=${encodeURIComponent(where)}`,
        { transport },
      );
      const detail = entry.status === 200 ? `HTTP 200, items: ${entry.body?.Items?.length ?? 0}` : `HTTP ${entry.status}`;
      line(`where=${name}`, entry.status === 200, detail);
    }
  }

  /* 6. API v2 ------------------------------------------------------------- */
  console.log("\n6. API v2 availability");
  for (const [name, path] of [
    ["Assignable", "/api/v2/Assignable?take=1&select={id}"],
    ["assignable", "/api/v2/assignable?take=1&select={id}"],
  ]) {
    const entry = await request(`v2/${name}`, `${base}${path}`, { transport });
    line(`GET /api/v2/${name}`, entry.status === 200, `HTTP ${entry.status}`);
  }

  /* 7. Entity browser URL ------------------------------------------------- */
  console.log("\n7. Entity browser URL format");
  const sampleId = assignables.body?.Items?.[0]?.Id;
  if (sampleId == null) {
    line("entity URL", "SKIP", "no sample entity id available");
  } else {
    const candidates = [`/entity/${sampleId}`, `/RestUI/Board.aspx#page=userstory/${sampleId}`];
    for (const path of candidates) {
      const entry = await request(`url${path}`, `${base}${path}`, { transport });
      const masked = path.split(String(sampleId)).join("<id>");
      const target = entry.location ? ` -> ${scrub(entry.location).split(String(sampleId)).join("<id>")}` : "";
      line(masked, entry.status < 400, `HTTP ${entry.status}${target}`);
    }
  }

  /* 8. Metadata ----------------------------------------------------------- */
  console.log("\n8. /api/v1/index/meta");
  const meta = await request("meta", `${base}/api/v1/index/meta?format=json`, { transport });
  if (meta.status === 200) {
    const described =
      meta.body?.Items ?? meta.body?.ResourceMetadataDescriptions ?? meta.body?.ResourceMetadataDescription ?? [];
    const items = Array.isArray(described) ? described : [described];
    const names = items.map((item) => item?.Name).filter(Boolean);
    line("GET /api/v1/index/meta", true, `${names.length} resource types`);
    const relevant = names.filter((name) => ASSIGNABLE_TYPES.includes(name) || /^Assignable/.test(name));
    console.log(`  relevant types present: ${relevant.join(", ") || "(none matched - see body shape below)"}`);
    if (relevant.length === 0) console.log(`  meta body shape: ${scrub(JSON.stringify(shape(meta.body, 2)))}`);
  } else {
    line("GET /api/v1/index/meta", false, `HTTP ${meta.status}`);
  }

  /* Summary --------------------------------------------------------------- */
  const v2Available = results.some((r) => r.label.startsWith("v2/") && r.status === 200);
  const failed = results.filter((r) => r.status === 0 || r.status >= 400).length;

  console.log("\nSummary");
  console.log(`  auth transport:  ${transport}`);
  console.log(`  Assignables:     ${assignables.status === 200 ? "available" : "unavailable"}`);
  console.log(`  API v2:          ${v2Available ? "available" : "unavailable"}`);
  console.log(`  failed requests: ${failed} of ${results.length}`);
  console.log("\nEverything above is structural. No token, entity name or description was printed.\n");
}

main().catch((error) => {
  if (error instanceof ProbeExit) return;
  console.error(`\n  ${scrub(error?.stack || String(error))}\n`);
  process.exitCode = 1;
});
