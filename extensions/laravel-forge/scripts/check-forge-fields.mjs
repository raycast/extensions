import { readFileSync } from "node:fs";

const SPEC = "https://forge.laravel.com/api/docs.openapi";

const forgeFields = JSON.parse(readFileSync(new URL("../src/tools/forge-fields.json", import.meta.url), "utf8"));

const response = await fetch(SPEC, { signal: AbortSignal.timeout(30_000) });
if (!response.ok) {
  console.error(`Could not read ${SPEC}: ${response.status}`);
  process.exit(1);
}
const spec = await response.json();

let drifted = false;

// Blind-slicing the last character turns filter[tag][] into "tag][" and reports it twice
const declared = (params, prefix) =>
  params
    .filter((name) => name.startsWith(prefix) && name.endsWith("]"))
    .map((name) => name.slice(prefix.length, -1));

const compare = (label, ours, theirs, fix) => {
  const missing = theirs.filter((name) => !ours.includes(name));
  const stale = ours.filter((name) => !theirs.includes(name));
  if (missing.length) console.error(`${label}: Forge has ${missing.length} we do not name: ${missing.join(", ")}`);
  if (stale.length) console.error(`${label}: we name ${stale.length} Forge no longer has: ${stale.join(", ")}`);
  if (missing.length || stale.length) console.error(`  ${fix}`);
  return !missing.length && !stale.length;
};

for (const [target, { schema, ours, fields, listPath, sortPath, filters, sorts }] of Object.entries(forgeFields)) {
  if (listPath) {
    const op = spec.paths?.[listPath]?.get;
    if (!op) {
      console.error(`${target}: ${listPath} has no GET in the spec. Renamed?`);
      drifted = true;
    } else {
      const params = (op.parameters ?? []).map((param) => param.name);
      if (!compare(`${target} filters`, filters, declared(params, "filter["), "Wire them into the list tool."))
        drifted = true;

      // Forge sorts sites only under the server-scoped route, not the org one
      const sortOp = spec.paths?.[sortPath ?? listPath]?.get;
      if (!sortOp) {
        console.error(`${target}: ${sortPath ?? listPath} has no GET in the spec. Renamed?`);
        drifted = true;
      } else {
        const sortable = (sortOp.parameters ?? []).find((param) => param.name === "sort");
        const enumerated = [...new Set((sortable?.schema?.items?.enum ?? []).map((name) => name.replace(/^-/, "")))];
        if (!compare(`${target} sorts`, sorts, enumerated, "Wire them into the list tool.")) drifted = true;
      }
    }
  }

  const attributes = spec.components?.schemas?.[schema]?.properties?.attributes?.properties;
  if (!attributes) {
    console.error(`${schema} has no attributes in the spec. Renamed?`);
    drifted = true;
    continue;
  }

  const inSpec = Object.keys(attributes);
  const named = Object.keys(fields).filter((name) => !ours.includes(name));

  const missing = inSpec.filter((name) => !named.includes(name));
  const stale = named.filter((name) => !inSpec.includes(name));

  if (missing.length) {
    console.error(`${target}: Forge has ${missing.length} field(s) probe-api does not name: ${missing.join(", ")}`);
    drifted = true;
  }
  if (stale.length) {
    console.error(`${target}: probe-api names ${stale.length} field(s) Forge no longer has: ${stale.join(", ")}`);
    drifted = true;
  }
  if (!missing.length && !stale.length) console.log(`${target}: ${named.length} fields match ${schema}`);
}

if (drifted) {
  console.error("\nUpdate src/tools/forge-fields.json, giving each new field a description.");
  process.exit(1);
}
