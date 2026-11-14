/**
 * Keeps the summary model lists current against Raycast's own `AI.Model` catalog.
 *
 * The lists live in three places: `SUMMARY_MODELS` and the style configs in src/config/ai.ts,
 * the `summaryModel` preference in package.json, and the test stub. Raycast publishes no
 * catalog API, but its type definitions mark each retired model `@deprecated` and name the
 * replacement, which is enough to update the lists without a judgment call.
 *
 * Pure functions only. `sync-summary-models.mjs` does the file I/O.
 */

const VERSION = /\d+(?:\.\d+)*/;

/** Parses the `AI.Model` enum out of `@raycast/api/types/index.d.ts`. */
export function parseModelCatalog(dts) {
  const start = dts.indexOf("enum Model {");
  if (start === -1) throw new Error("No `enum Model` in the @raycast/api types.");
  const body = dts.slice(start, dts.indexOf("\n    }", start));

  // A JSDoc block can wrap, so read each whole block before the entry it documents.
  // `deprecatedFor` is the successor key, `null` for deprecated with no readable successor.
  const catalog = new Map();
  let comment = null;
  let deprecatedFor;
  for (const line of body.split("\n")) {
    if (comment === null && line.includes("/**")) comment = "";
    if (comment !== null) {
      comment += line + "\n";
      if (!line.includes("*/")) continue;
      if (comment.includes("@deprecated")) deprecatedFor = comment.match(/AI\.Model\["([^"]+)"\]/)?.[1] ?? null;
      comment = null;
      continue;
    }
    const entry = line.match(/^\s*"([^"]+)"\s*=\s*"([^"]+)"/);
    if (entry) {
      catalog.set(entry[1], { value: entry[2], deprecatedFor });
      deprecatedFor = undefined;
    }
  }
  return catalog;
}

/** Every model ai.ts names, in order: the menu, the default, and each style's `AI.Model[...]`. */
export function referencedModels(aiTs) {
  aiTs = aiTs.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, "");
  const keys = [
    ...[...aiTs.matchAll(/\{ key: "([^"]+)", title:/g)].map((m) => m[1]),
    aiTs.match(/DEFAULT_SUMMARY_MODEL: SummaryModelKey = "([^"]+)"/)?.[1],
    ...[...aiTs.matchAll(/AI\.Model\["([^"]+)"\]/g)].map((m) => m[1]),
  ];
  return [...new Set(keys.filter(Boolean))];
}

/** "OpenAI_GPT-5.6_Terra" → "OpenAI_GPT-#_Terra": models that differ only by version. */
function lineOf(key) {
  return key.replace(VERSION, "#");
}

function compareVersions(a, b) {
  const pa = (a.match(VERSION)?.[0] ?? "0").split(".").map(Number);
  const pb = (b.match(VERSION)?.[0] ?? "0").split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff) return diff;
  }
  return 0;
}

function newestInLine(catalog, key) {
  let newest = key;
  for (const [candidate, { deprecatedFor }] of catalog) {
    if (deprecatedFor === undefined && lineOf(candidate) === lineOf(key) && compareVersions(candidate, newest) > 0) {
      newest = candidate;
    }
  }
  return newest;
}

/**
 * For each model (`menuKeys` are the ones with a menu row): follow Raycast's deprecation chain, then move to the newest
 * non-deprecated version of the same line. Throws for a model Raycast has removed outright, or
 * deprecated without a replacement it can read, because nothing names what to use instead.
 */
export function planModelUpdates(catalog, keys, menuKeys = keys) {
  const plan = [];
  const kept = new Set();
  for (const key of keys) {
    if (!catalog.has(key)) {
      throw new Error(`"${key}" is no longer in @raycast/api's AI.Model, and nothing names a replacement.`);
    }
    let to = key;
    const seen = new Set();
    while (catalog.get(to).deprecatedFor !== undefined) {
      const next = catalog.get(to).deprecatedFor;
      if (next === null || !catalog.has(next) || seen.has(to)) {
        throw new Error(`"${to}" is deprecated, and @raycast/api's types don't name a usable replacement.`);
      }
      seen.add(to);
      to = next;
    }
    const reason = to === key ? "newer" : "deprecated";
    to = newestInLine(catalog, to);
    if (to === key) {
      kept.add(key);
      continue;
    }
    plan.push({ from: key, to, reason, duplicate: false });
  }
  // Only a menu row can duplicate another menu row; a model a style alone uses has no row.
  const menu = new Set(menuKeys);
  const rows = new Set([...kept].filter((key) => menu.has(key)));
  for (const update of plan) {
    if (!menu.has(update.from)) continue;
    update.duplicate = rows.has(update.to);
    rows.add(update.to);
  }
  return plan;
}

/** "OpenAI_GPT-5.6_Terra" → "GPT-5.6 Terra", matching the titles the lists already use. */
export function modelTitle(key) {
  return key
    .replace(/^[^_]+_/, "")
    .replace(/_/g, " ")
    .replace(/^Grok-/, "Grok ");
}

function removeRow(aiTs, key) {
  return aiTs
    .split("\n")
    .filter((line) => !line.includes(`{ key: "${key}",`))
    .join("\n");
}

function retitleRow(aiTs, key, title) {
  return aiTs
    .split("\n")
    .map((line) => (line.includes(`{ key: "${key}",`) ? line.replace(/title: "[^"]*"/, `title: "${title}"`) : line))
    .join("\n");
}

/** Applies a plan to the text of ai.ts, the parsed manifest, and the text of the test stub. */
export function applyModelUpdates({ plan, catalog, defaultKey, aiTs, manifest, stub }) {
  const pref = manifest.preferences.find((p) => p.name === "summaryModel");
  for (const { from, to, duplicate } of plan) {
    if (duplicate) {
      // Two rows merge into one. The default keeps its place at the top; otherwise the replacement's row stays.
      const drop = from === defaultKey ? to : from;
      aiTs = removeRow(aiTs, drop);
      pref.data = pref.data.filter((row) => row.value !== drop);
    }
    if (!duplicate || from === defaultKey) {
      aiTs = retitleRow(aiTs, from, modelTitle(to));
      for (const row of pref.data) {
        if (row.value === from) Object.assign(row, { title: modelTitle(to), value: to });
      }
    }
    if (from === defaultKey) {
      for (const row of pref.data) {
        if (row.value === "default") row.title = `Default (${modelTitle(to)})`;
      }
    }
    aiTs = aiTs.replaceAll(`"${from}"`, `"${to}"`);

    if (!stub.includes(`"${to}":`)) {
      stub = stub.replace(/(Model: \{\n)/, `$1    "${to}": "${catalog.get(to).value}",\n`);
    }
  }
  return { aiTs, manifest, stub };
}
