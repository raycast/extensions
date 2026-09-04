import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";

const requirePackage = createRequire(import.meta.url);

const cache = new Map();
let stateValues = [];
let errors = [];
let openedUrls = [];
let closedWindows = 0;
let customCacheReads = 0;
let effects = [];
const mocks = {
  "@raycast/api": {
    Action: { SubmitForm: "SubmitForm", CopyToClipboard: "CopyToClipboard", Style: {} },
    ActionPanel: { Section: "Section", Submenu: "Submenu" },
    Form: { TextField: "TextField", Description: "Description", Separator: "Separator" },
    List: { Item: "Item", Dropdown: { Item: "DropdownItem" } },
    Icon: {},
    Keyboard: { Shortcut: { Common: {} } },
    Toast: { Style: {} },
    PopToRootType: { Immediate: "Immediate" },
    open: async (url) => openedUrls.push(url),
    closeMainWindow: async () => closedWindows++,
    showHUD: async () => {},
    environment: { extensionName: "search-router-test" },
    getPreferenceValues: () => ({}),
    Cache: class {
      get(key) {
        if (key === "customSearchEngines") customCacheReads++;
        return cache.get(key);
      }
      set(key, value) {
        cache.set(key, value);
      }
    },
    useNavigation: () => ({ pop() {}, push() {} }),
    showToast: async () => {},
  },
  "@raycast/utils": {
    useCachedState: (key, initial) => [
      cache.has(key) ? JSON.parse(cache.get(key)) : initial,
      (value) => cache.set(key, JSON.stringify(value)),
    ],
    showFailureToast: async (error) => {
      throw error;
    },
  },
  react: {
    useEffect: (effect) => effects.push(effect),
    useRef: (initial) => ({ current: initial }),
    useState: (initial) => [
      stateValues.length ? stateValues.shift() : typeof initial === "function" ? initial() : initial,
      (value) => errors.push(value),
    ],
    useMemo: (fn) => fn(),
  },
  "react/jsx-runtime": {
    jsx: (type, props) => ({ type, props }),
    jsxs: (type, props) => ({ type, props }),
  },
};
const modules = new Map();
function load(file) {
  if (modules.has(file)) return modules.get(file).exports;
  const module = { exports: {} };
  modules.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  new Function("require", "module", "exports", code)(
    (name) => {
      if (mocks[name]) return mocks[name];
      if (!name.startsWith(".")) return requirePackage(name);
      const base = path.resolve(path.dirname(file), name);
      return load([base + ".ts", base + ".tsx"].find(fs.existsSync));
    },
    module,
    module.exports,
  );
  return module.exports;
}
function elements(node) {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!node?.props) return [];
  return [node, ...elements(node.props.children), ...elements(node.props.actions)];
}
const src = path.resolve(import.meta.dirname, "../src");
const Add = load(path.join(src, "add-custom-search-engine.tsx")).default;
const Browse = load(path.join(src, "browse-search-engines.tsx")).default;
const Search = load(path.join(src, "search.tsx")).default;
const { builtinSearchEngines } = load(path.join(src, "data/builtin-search-engines.ts"));
const { getSearchEngine, getBuiltinSearchEngine, getEffectiveAliases, getCustomSearchEnginesByTrigger } = load(
  path.join(src, "data/search-engines.ts"),
);
const { getCustomSearchEngines, addCustomSearchEngine, removeCustomSearchEngine } = load(
  path.join(src, "data/custom-search-engines.ts"),
);
const { getDefaultSearchEngine } = load(path.join(src, "data/cache.ts"));
let aliasLookups = 0;
const searchEngineModule = load(path.join(src, "data/search-engines.ts"));
searchEngineModule.getEffectiveAliases = (...args) => {
  aliasLookups++;
  return getEffectiveAliases(...args);
};
async function submit(trigger, engine) {
  errors = [];
  const form = Add({ engine, onEngineAdded() {} });
  const action = elements(form).find((element) => element.type === "SubmitForm");
  await action.props.onSubmit({ name: "Override", trigger, url_0: "https://custom.example/?q={{{s}}}" });
}
function row(trigger, filter, prefix = "!") {
  stateValues = [trigger, filter];
  const item = elements(Browse()).find(
    (element) => element.type === "Item" && element.props.subtitle === `${prefix}${trigger}`,
  );
  assert.ok(item, `${filter} row for ${trigger}`);
  return item;
}
function canCopy(item) {
  return elements(item).some((element) => element.props.title === "Copy Search Engine Shortcut");
}

function canCopyAlias(item, alias) {
  return elements(item).some((element) => element.type === "CopyToClipboard" && element.props.content === `!${alias}`);
}

function isDefaultRow(item) {
  return item.props.accessories.some((accessory) => accessory.text === "Default");
}

function tag(item) {
  return item.props.accessories.find((accessory) => accessory.tag?.startsWith("Overrides"))?.tag;
}

function findByAlias(alias, primary, filter = "all") {
  stateValues = [alias, filter];
  const list = Browse();
  assert.equal(list.props.filtering, false, "Fuse handles alias filtering without native filtering hiding matches");
  const item = elements(list).find((element) => element.type === "Item" && element.props.subtitle === `!${primary}`);
  assert.ok(item, `${filter} search for alias ${alias} finds ${primary}`);
  return item;
}

function browseResults(query) {
  stateValues = [query, "all"];
  return elements(Browse())
    .filter((element) => element.type === "Item")
    .map((element) => element.props.title);
}

async function search(query) {
  openedUrls = [];
  closedWindows = 0;
  const form = Search({ arguments: {} });
  const action = elements(form).find((element) => element.type === "SubmitForm");
  // Count routing lookups separately from resolving the cheat sheet's labels.
  customCacheReads = 0;
  await action.props.onSubmit({ query });
  assert.equal(closedWindows, 1, query);
  assert.equal(openedUrls.length, 1, query);
  return new URL(openedUrls[0]);
}

(async () => {
  const specialBuiltins = builtinSearchEngines.filter((engine) => !/^!?[a-zA-Z0-9-_]+$/.test(engine.t));
  assert.ok(specialBuiltins.some((engine) => engine.t === "c++"));
  for (const engine of specialBuiltins) {
    cache.clear();
    await submit(engine.t, engine);
    assert.equal(getSearchEngine(engine.t).u, "https://custom.example/?q={{{s}}}", engine.t);
  }
  for (const trigger of ["c++", " !C++ ", "my-engine_2"]) {
    cache.clear();
    await submit(trigger);
    assert.equal(getCustomSearchEngines().length, 1, trigger);
  }
  for (const trigger of ["", " ", "!", "two words", "unknown++", "unknown-тест"]) {
    cache.clear();
    await submit(trigger);
    assert.equal(getCustomSearchEngines().length, 0, trigger);
    assert.ok(errors.some((error) => typeof error === "string"));
  }
  cache.clear();
  await submit("c++", getBuiltinSearchEngine("c++"));
  await submit("!C++", getBuiltinSearchEngine("c++"));
  assert.ok(errors.includes("A custom search engine with this trigger already exists"));
  await submit("c++", getCustomSearchEngines()[0]);
  assert.ok(!errors.some((error) => typeof error === "string"));
  assert.equal(getCustomSearchEngines().length, 1);

  cache.clear();
  addCustomSearchEngine({
    s: "Custom Google",
    t: "g",
    d: "custom.example",
    u: "https://custom.example/?q={{{s}}}",
    isCustom: true,
  });
  assert.equal(canCopy(row("g", "builtin")), false);
  assert.equal(canCopy(row("b", "builtin")), true);
  assert.equal(canCopy(row("g", "custom")), true);
  assert.equal(canCopy(row("g", "all")), true);
  assert.equal(getSearchEngine("g").d, "custom.example");
  console.log(`Override checks passed, including ${specialBuiltins.length} special built-in triggers.`);

  cache.clear();
  let aliasCount = 0;
  for (const engine of builtinSearchEngines) {
    assert.equal(getBuiltinSearchEngine(engine.t), engine, engine.t);
    for (const alias of engine.ts ?? []) {
      assert.equal(getSearchEngine(alias), engine, alias);
      assert.equal(getSearchEngine(alias.toUpperCase()), engine, alias);
      aliasCount++;
    }
  }
  for (const [alias, primary] of [
    ["w", "wikipedia"],
    ["gm", "gmap"],
    ["so", "ov"],
    ["r", "reddit"],
  ]) {
    assert.equal(getBuiltinSearchEngine(alias).t, primary);
  }
  assert.equal(getSearchEngine("unknown-shortcut-for-testing"), undefined);
  assert.equal(getSearchEngine(), undefined);

  let url = await search("!W cats");
  assert.equal(url.hostname, "wikipedia.org");
  assert.equal(url.searchParams.get("search"), "cats");
  url = await search("coffee Bangkok !gm");
  assert.equal(url.hostname, "maps.google.com");
  assert.equal(url.searchParams.get("q"), "coffee Bangkok");
  url = await search("!so typescript generics");
  assert.equal(url.hostname, "stackoverflow.com");
  assert.equal(url.searchParams.get("q"), "typescript generics");
  url = await search("!r mechanical keyboards");
  assert.equal(url.hostname, "www.reddit.com");
  assert.equal(url.searchParams.get("q"), "mechanical keyboards");
  url = await search("typescript @SO");
  assert.equal(url.hostname, "www.google.com");
  assert.equal(url.searchParams.get("q"), "typescript site:stackoverflow.com");
  url = await search("@SO typescript");
  assert.equal(url.searchParams.get("q"), "typescript site:stackoverflow.com");
  url = await search("refund support@audible.com");
  assert.equal(url.hostname, "www.google.com");
  assert.equal(url.searchParams.get("q"), "refund support@audible.com", "email addresses are not site filters");
  url = await search("ping @john about typescript @so");
  assert.equal(url.searchParams.get("q"), "ping @john about typescript site:stackoverflow.com");
  url = await search("@john @SO typescript @gh");
  assert.equal(
    url.searchParams.get("q"),
    "@john typescript @gh site:stackoverflow.com",
    "use the first recognized site filter",
  );
  url = await search("refund support@audible.com @john @so");
  assert.equal(url.searchParams.get("q"), "refund support@audible.com @john site:stackoverflow.com");
  url = await search("ping @john about typescript");
  assert.equal(url.searchParams.get("q"), "ping @john about typescript", "unknown mentions remain query text");
  url = await search("!w");
  assert.equal(url.href, "https://wikipedia.org/");
  url = await search("plain query");
  assert.equal(url.hostname, "www.google.com");
  assert.equal(url.searchParams.get("q"), "plain query");
  for (const query of ["hello!w", "x!so", "note!r", "a!gm", "https://example.com/#!/route"]) {
    url = await search(query);
    assert.equal(url.hostname, "www.google.com", `embedded bang keeps default routing: ${query}`);
    assert.equal(url.searchParams.get("q"), query, `embedded bang stays in query: ${query}`);
  }
  url = await search("hello!w !so typescript");
  assert.equal(url.hostname, "stackoverflow.com");
  assert.equal(url.searchParams.get("q"), "hello!w typescript");

  await submit("wikipedia");
  assert.equal(getSearchEngine("w").t, "wikipedia");
  assert.equal(getSearchEngine("W").d, "custom.example");
  url = await search("!w cats");
  assert.equal(url.hostname, "custom.example");
  assert.equal(url.searchParams.get("q"), "cats");
  url = await search("cats @w");
  assert.equal(url.searchParams.get("q"), "cats site:custom.example");

  await submit("w");
  assert.equal(getSearchEngine("w").t, "w");
  assert.equal(getSearchEngine("wikipedia").t, "wikipedia");
  assert.equal(getSearchEngine("wiki").t, "wikipedia");
  assert.equal(getBuiltinSearchEngine("w").t, "wikipedia");
  cache.clear();
  assert.equal(getSearchEngine("w").t, "wikipedia");
  console.log(`Alias checks passed for ${aliasCount} aliases, query routing, site filters, and custom priority.`);

  stateValues = ["", "all"];
  aliasLookups = 0;
  const initialList = Browse();
  assert.equal(elements(initialList).filter((element) => element.type === "Item").length, 20);
  assert.equal(aliasLookups, 20, "an empty browse query resolves aliases only for visible rows");
  await submit("wikipedia");
  await submit("g");
  for (const query of ["", "wiki"]) {
    stateValues = [query, "custom"];
    aliasLookups = 0;
    Browse();
    assert.equal(aliasLookups, 2, "custom-only browsing and search resolve no built-in aliases");
  }
  cache.clear();

  for (const alias of ["w", "r", "so", "gm"]) {
    cache.clear();
    await submit(alias);
    cache.set("defaultSearchEngine", JSON.stringify(getCustomSearchEngines()[0]));
    assert.equal(getDefaultSearchEngine().t, alias, `active custom default ${alias}`);
    removeCustomSearchEngine(alias);
    assert.equal(getDefaultSearchEngine().t, "g", `deleted custom default ${alias}`);
    assert.equal(isDefaultRow(row("g", "all")), true, `Browse marks the Google fallback after deleting ${alias}`);
    url = await search("plain query");
    assert.equal(url.hostname, "www.google.com");
  }
  cache.clear();
  cache.set("defaultSearchEngine", JSON.stringify(getBuiltinSearchEngine("wikipedia")));
  assert.equal(getDefaultSearchEngine().t, "wikipedia");
  await submit("wikipedia");
  assert.equal(getDefaultSearchEngine().d, "custom.example");
  removeCustomSearchEngine("wikipedia");
  assert.equal(getDefaultSearchEngine().d, "wikipedia.org");
  cache.set("defaultSearchEngine", JSON.stringify({ t: "w", isCustom: true }));
  await submit("g");
  customCacheReads = 0;
  assert.equal(getDefaultSearchEngine().d, "custom.example");
  assert.equal(customCacheReads, 1, "default and fallback share one custom cache read");

  cache.clear();
  for (const trigger of ["w", "W", "wikipedia", "unknown-shortcut-for-testing"]) {
    customCacheReads = 0;
    getSearchEngine(trigger);
    assert.equal(customCacheReads, 1, `one custom cache read for ${trigger}`);
  }
  customCacheReads = 0;
  getSearchEngine();
  assert.equal(customCacheReads, 0, "no cache read without a trigger");
  customCacheReads = 0;
  await search("!w cats @so");
  assert.equal(customCacheReads, 1, "one custom cache read shared by bang and site lookups");
  for (const query of ["cats @so", "!unknown cats @john @so", "!w cats @john @so", "plain query"]) {
    await search(query);
    assert.equal(customCacheReads, 1, `one custom cache read for ${query}`);
  }

  for (const [alias, primary] of [
    ["so", "ov"],
    ["gm", "gmap"],
    ["w", "wikipedia"],
    ["r", "reddit"],
  ]) {
    const item = findByAlias(alias, primary);
    assert.ok(canCopyAlias(item, alias), `copy ${alias}`);
    assert.ok(item.props.accessories.some((accessory) => accessory.tooltip?.includes(`!${alias}`)));
  }
  await submit("w");
  assert.equal(tag(row("w", "custom")), "Overrides !w (Wikipedia alias)");
  assert.equal(canCopyAlias(row("wikipedia", "builtin"), "w"), false);
  assert.equal(canCopyAlias(row("wikipedia", "builtin"), "wiki"), true);
  assert.equal(canCopy(row("wikipedia", "all")), true);
  await submit("wikipedia");
  assert.equal(tag(row("wikipedia", "custom")), "Overrides Wikipedia");
  assert.equal(canCopyAlias(findByAlias("wiki", "wikipedia", "custom"), "wiki"), true);
  assert.equal(canCopyAlias(row("wikipedia", "custom"), "w"), false);
  assert.equal(canCopyAlias(row("wikipedia", "builtin"), "wiki"), false);

  for (const alias of ["2гис", "дубльгис"]) {
    cache.clear();
    await submit(alias);
    assert.equal(getCustomSearchEngines().length, 1, `valid custom alias ${alias}`);
    assert.equal(getSearchEngine(alias).d, "custom.example");
    assert.equal(getSearchEngine("2gis").d, "2gis.ru");
    assert.equal(tag(row(alias, "custom")), `Overrides !${alias} (2GIS alias)`);
    assert.equal(canCopyAlias(row("2gis", "builtin"), alias), false);
    url = await search(`!${alias} Bangkok`);
    assert.equal(url.hostname, "custom.example");
    url = await search(`Bangkok @${alias}`);
    assert.equal(url.searchParams.get("q"), "Bangkok site:custom.example");
  }
  cache.clear();
  await submit("wikipedia");
  const renamedEngine = getCustomSearchEngines()[0];
  cache.set("defaultSearchEngine", JSON.stringify(renamedEngine));
  await submit("w", renamedEngine);
  assert.deepEqual(
    getCustomSearchEngines().map((engine) => engine.t),
    ["w"],
    "editing a trigger replaces the old engine",
  );
  assert.equal(getSearchEngine("wikipedia").d, "wikipedia.org", "old primary override is removed");
  assert.equal(getSearchEngine("wiki").d, "wikipedia.org", "old aliases return to the built-in engine");
  assert.equal(getSearchEngine("w").d, "custom.example");
  assert.equal(getDefaultSearchEngine().t, "w", "renaming preserves the selected custom default");
  assert.ok(
    getEffectiveAliases(
      getBuiltinSearchEngine("wikipedia"),
      getCustomSearchEnginesByTrigger(getCustomSearchEngines()),
    ).includes("wiki"),
  );
  assert.ok(
    !getEffectiveAliases(
      getBuiltinSearchEngine("wikipedia"),
      getCustomSearchEnginesByTrigger(getCustomSearchEngines()),
    ).includes("w"),
  );
  await submit("occupied");
  await submit(
    "occupied",
    getCustomSearchEngines().find((engine) => engine.t === "w"),
  );
  assert.ok(errors.includes("A custom search engine with this trigger already exists"));
  assert.deepEqual(
    getCustomSearchEngines().map((engine) => engine.t),
    ["occupied", "w"],
    "failed rename keeps both engines intact",
  );
  cache.clear();
  const builtinDefault = getBuiltinSearchEngine("wikipedia");
  cache.set("defaultSearchEngine", JSON.stringify(builtinDefault));
  await submit("wikipedia");
  await submit("w", getCustomSearchEngines()[0]);
  assert.deepEqual(
    JSON.parse(cache.get("defaultSearchEngine")),
    builtinDefault,
    "renaming an override preserves the built-in default",
  );
  assert.equal(getDefaultSearchEngine().t, "wikipedia");
  removeCustomSearchEngine("w");
  assert.equal(getDefaultSearchEngine().t, "wikipedia", "deleting the renamed override keeps Wikipedia selected");
  cache.clear();
  customCacheReads = 0;
  Search({ arguments: {} });
  assert.equal(customCacheReads, 1, "the cheat sheet reads the custom-engine cache once");
  await submit("wikipedia");
  await submit("gh");
  const descriptions = elements(Search({ arguments: {} })).filter((element) => element.type === "Description");
  assert.ok(
    descriptions.find((element) => element.props.title === "Everyday").props.text.includes("!w Bangkok — Override"),
  );
  assert.ok(
    descriptions
      .find((element) => element.props.title === "Code & forums")
      .props.text.includes("!gh markdown parser — Override"),
  );
  assert.ok(
    descriptions.find((element) => element.props.title === "Tips").props.text.includes("Search within Override:"),
  );
  addCustomSearchEngine({
    s: "Alias Override",
    t: "w",
    d: "alias.example",
    u: "https://alias.example/?q={{{s}}}",
    isCustom: true,
  });
  const aliasDescriptions = elements(Search({ arguments: {} })).filter((element) => element.type === "Description");
  assert.ok(
    aliasDescriptions
      .find((element) => element.props.title === "Everyday")
      .props.text.includes("!w Bangkok — Alias Override"),
  );
  cache.clear();
  for (const props of [
    { arguments: { query: "!yt guitar lessons" } },
    { arguments: {}, fallbackText: "!yt guitar lessons" },
  ]) {
    effects = [];
    openedUrls = [];
    closedWindows = 0;
    customCacheReads = 0;
    Search(props);
    assert.equal(customCacheReads, 0, "immediate launch skips cheat sheet cache reads");
    effects.forEach((effect) => effect());
    await new Promise(setImmediate);
    assert.equal(openedUrls.length, 1, "launch query runs once");
    assert.equal(new URL(openedUrls[0]).searchParams.get("search_query"), "guitar lessons");
    assert.equal(closedWindows, 1);
    effects.forEach((effect) => effect());
    await new Promise(setImmediate);
    assert.equal(openedUrls.length, 1, "repeated effects do not run the initial query again");
  }
  console.log("Cheat sheet override labels and immediate argument/fallback launches passed.");

  const browseQueries = ["w", "yt", "wikipedia.org"].map((query) => [query, browseResults(query)]);
  for (const preference of ["!", ".", " . ", "engine:", "[.]", "", "   "]) {
    const prefix = preference.trim();
    cache.clear();
    mocks["@raycast/api"].getPreferenceValues = () => ({ engineTriggerPrefix: preference });
    const descriptions = elements(Search({ arguments: {} })).filter((element) => element.type === "Description");
    for (const [title, example] of [
      ["Everyday", `${prefix}w Bangkok — Wikipedia`],
      ["Code & forums", `${prefix}gh markdown parser — GitHub`],
    ]) {
      assert.ok(descriptions.find((element) => element.props.title === title).props.text.includes(example));
    }
    const tips = descriptions.find((element) => element.props.title === "Tips").props.text;
    assert.ok(tips.includes(`A trigger alone opens its website: ${prefix}w`));
    assert.ok(tips.includes("Legacy !bangs still work mid-query or at the end: cats !g"));
    assert.ok(tips.includes("markdown parser @gh"));
    assert.equal(tips.includes("redirect plain text"), prefix === "");
    for (const [query, expected] of browseQueries) {
      for (const input of [query, `${prefix}${query}`, ` ${prefix}${query} `, `!${query}`]) {
        assert.deepEqual(browseResults(input), expected, `Browse ${input} with prefix ${prefix}`);
      }
    }
    const item = row("wikipedia", "all", prefix);
    const accessory = item.props.accessories.find((accessory) => accessory.tooltip);
    assert.ok(accessory.text.startsWith(`Aliases: ${prefix}wiki, ${prefix}w, `));
    assert.ok(accessory.tooltip.split(", ").includes(`${prefix}w`));
    const copyAlias = elements(item).find((element) => element.props.title === `Copy ${prefix}w`);
    assert.equal(copyAlias?.props.content, `${prefix}w`);
    for (const query of [`${prefix}w cats`, "!w cats"]) {
      const url = await search(query);
      assert.equal(url.hostname, "wikipedia.org");
      assert.equal(url.searchParams.get("search"), "cats");
    }
    for (const [query, expected] of [
      ["go tutorials !g", "go tutorials"],
      ["go tutorials !G @so", "go tutorials site:stackoverflow.com"],
    ]) {
      const url = await search(query);
      assert.equal(url.hostname, "www.google.com");
      assert.equal(url.searchParams.get("q"), expected);
    }
    if (!prefix) {
      for (const query of ["tutorials", "tutorials !unknown-shortcut-for-testing"]) {
        const url = await search(`go ${query}`);
        assert.equal(url.hostname, "mail.google.com");
        assert.equal(decodeURIComponent(url.hash), `#search/${query}`);
      }
    } else if (prefix !== "!") {
      const url = await search(`${prefix}w cats !g`);
      assert.equal(url.hostname, "wikipedia.org");
      assert.equal(url.searchParams.get("search"), "cats !g", "explicit custom prefix still takes precedence");
    }
    await submit("w");
    assert.equal(tag(row("w", "custom", prefix)), `Overrides ${prefix}w (Wikipedia alias)`);
  }
  console.log("Alias presentation, Browse filtering, examples, tips, and routing passed for all prefixes.");

  for (const preference of ["@", " @ ", "my prefix", "my\tprefix", "my\nprefix", "my\u00a0prefix"]) {
    cache.clear();
    mocks["@raycast/api"].getPreferenceValues = () => ({ engineTriggerPrefix: preference });
    for (const [query, host, parameter, expected] of [
      ["plain query", "www.google.com", "q", "plain query"],
      ["!w cats", "wikipedia.org", "search", "cats"],
      ["cats @so", "www.google.com", "q", "cats site:stackoverflow.com"],
      ["@w cats", "www.google.com", "q", "cats site:wikipedia.org"],
    ]) {
      const url = await search(query);
      assert.equal(url.hostname, host);
      assert.equal(url.searchParams.get(parameter), expected);
    }
    assert.equal(elements(row("wikipedia", "all")).find((x) => x.props.title === "Copy !w").props.content, "!w");
    assert.ok(browseResults("!w").includes("Wikipedia"));
    for (const view of [Search({ arguments: {} }), Browse(), Add({ onEngineAdded() {} })]) {
      const warning = elements(view).find((x) => x.props.title === "Invalid Engine Trigger Prefix");
      assert.ok((warning?.props.text ?? warning?.props.subtitle)?.includes("Using ! instead"));
    }
    for (const props of [{ arguments: { query: "!w cats" } }, { arguments: {}, fallbackText: "!w cats" }]) {
      effects = [];
      openedUrls = [];
      closedWindows = 0;
      Search(props);
      effects.forEach((effect) => effect());
      await new Promise(setImmediate);
      assert.equal(openedUrls.length, 1);
      assert.equal(new URL(openedUrls[0]).hostname, "wikipedia.org");
      assert.equal(closedWindows, 1);
    }
  }
  console.log("Invalid prefixes fall back consistently without blocking searches or site filters.");

  const saveError = new Error("Cache write failed");
  const originalSet = mocks["@raycast/api"].Cache.prototype.set;
  const originalFailureToast = mocks["@raycast/utils"].showFailureToast;
  const failures = [];
  try {
    mocks["@raycast/api"].Cache.prototype.set = () => {
      throw saveError;
    };
    mocks["@raycast/utils"].showFailureToast = async (...args) => failures.push(args);
    await submit("w");
    assert.deepEqual(failures, [[saveError, { title: "Failed to save search engine" }]]);
    assert.equal(getCustomSearchEngines().length, 0);
  } finally {
    mocks["@raycast/api"].Cache.prototype.set = originalSet;
    mocks["@raycast/utils"].showFailureToast = originalFailureToast;
  }
  console.log(
    "Review regression checks passed for defaults, cache reads, alias discovery, labels, and Unicode overrides.",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
