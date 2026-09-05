const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

// Render the actual command with inert Raycast elements. The hook returns
// controlled responses so request order and keepPreviousData are deterministic.
// No Raycast installation, API requests or credentials are used; the price fixture is a saved public response.
const sourceRoot = path.resolve(__dirname, "../src");
const compiled = Object.fromEntries(
  ["api", "search-odds"].map((name) => {
    const filename = path.join(sourceRoot, name + (name === "api" ? ".ts" : ".tsx"));
    const result = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      fileName: filename,
      reportDiagnostics: true,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    });
    assert.deepEqual(
      result.diagnostics.filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error),
      [],
    );
    return [name, result.outputText];
  }),
);

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

function response(query, homeTeam) {
  return {
    query,
    count: 1,
    results: [
      {
        type: "game",
        sport_key: "baseball_mlb",
        sport_title: "MLB",
        home_team: homeTeam,
        away_team: "Test Opponent",
      },
    ],
  };
}

function commandHarness() {
  const state = { searchText: "", data: undefined, isLoading: false, url: undefined, options: undefined };
  const modules = {};
  let memo;
  const element = (type, props) => ({ type, props: props || {} });
  const raycast = {
    Action: { Push: "Action.Push", OpenInBrowser: "Action.OpenInBrowser" },
    ActionPanel: "ActionPanel",
    Detail: "Detail",
    Icon: { MagnifyingGlass: "MagnifyingGlass", LineChart: "LineChart", BullsEye: "BullsEye" },
    List: Object.assign(() => {}, { Item: "List.Item", EmptyView: "List.EmptyView" }),
  };
  const imports = {
    "@raycast/api": raycast,
    "@raycast/utils": {
      useFetch(url, options) {
        state.url = url;
        state.options = options;
        return { data: state.data, isLoading: state.isLoading };
      },
    },
    react: {
      useState: () => [state.searchText, (value) => (state.searchText = value)],
      useMemo(create, dependencies) {
        if (!memo || dependencies.some((value, index) => !Object.is(value, memo.dependencies[index]))) {
          memo = { value: create(), dependencies };
        }
        return memo.value;
      },
    },
    "react/jsx-runtime": { jsx: element, jsxs: element },
  };
  function load(name) {
    if (modules[name]) return modules[name].exports;
    const module = { exports: {} };
    modules[name] = module;
    const requireModule = (specifier) => {
      if (specifier === "./api") return load("api");
      assert.ok(Object.hasOwn(imports, specifier), "Unexpected runtime dependency: " + specifier);
      return imports[specifier];
    };
    // Expose the private formatter only inside this isolated test module.
    const formatterExport = name === "search-odds" ? "\nmodule.exports.formatFullBoard = fullBoardMarkdown;" : "";
    vm.runInNewContext(compiled[name] + formatterExport, { module, exports: module.exports, require: requireModule });
    return module.exports;
  }
  const command = load("search-odds").default;
  return {
    state,
    render: () => command(),
    fullBoard: load("search-odds").formatFullBoard,
    search(text) {
      command().props.onSearchTextChange(text);
      return command();
    },
    request() {
      const pending = deferred();
      state.isLoading = true;
      const finished = pending.promise.then(
        (data) => {
          state.data = data;
          state.isLoading = false;
        },
        () => {
          // keepPreviousData can still retain the previous successful response.
          state.isLoading = false;
        },
      );
      return { ...pending, finished };
    },
  };
}

function findElements(node, type) {
  if (Array.isArray(node)) return node.flatMap((child) => findElements(child, type));
  if (!node || typeof node !== "object") return [];
  return [...(node.type === type ? [node] : []), ...findElements(node.props?.children, type)];
}

function actionableMatchups(tree) {
  return findElements(tree, "List.Item").map((item) => {
    const actions = findElements(item.props.actions, "Action.Push");
    assert.equal(actions.length, 1);
    return { title: item.props.title, homeTeam: actions[0].props.target.props.game.homeTeam };
  });
}

function assertNoMatchups(tree) {
  assert.deepEqual(actionableMatchups(tree), []);
}

test("changing valid searches immediately hides retained actionable results until the new response arrives", async () => {
  const harness = commandHarness();
  harness.search("Yankees");
  const first = harness.request();
  first.resolve(response("Yankees", "New York Yankees"));
  await first.finished;
  assert.equal(actionableMatchups(harness.render())[0].homeTeam, "New York Yankees");

  const second = harness.request();
  assertNoMatchups(harness.search("Dodgers"));
  assert.equal(new URL(harness.state.url).searchParams.get("q"), "Dodgers");
  assert.equal(harness.state.options.execute, true);
  second.resolve(response("Dodgers", "Los Angeles Dodgers"));
  await second.finished;
  assert.deepEqual(actionableMatchups(harness.render()), [
    { title: "Test Opponent @ Los Angeles Dodgers", homeTeam: "Los Angeles Dodgers" },
  ]);
});

test("a late response from a previous query cannot create actions under the new query", async () => {
  const harness = commandHarness();
  harness.search("Yankees");
  const first = harness.request();
  harness.search("Dodgers");
  const second = harness.request();
  second.resolve(response("Dodgers", "Los Angeles Dodgers"));
  await second.finished;
  assert.equal(actionableMatchups(harness.render())[0].homeTeam, "Los Angeles Dodgers");
  first.resolve(response("Yankees", "New York Yankees"));
  await first.finished;
  assertNoMatchups(harness.render());
});

test("failed replacement requests cannot leave the previous query's actions visible", async () => {
  const harness = commandHarness();
  harness.search("Yankees");
  harness.state.data = response("Yankees", "New York Yankees");
  harness.search("Dodgers");
  const pending = harness.request();
  pending.reject(new Error("Controlled network failure"));
  await pending.finished;
  assertNoMatchups(harness.render());
});

test("clearing or shortening the query hides results and disables execution, even after a late response", async () => {
  for (const query of ["", "Y", "  "]) {
    const harness = commandHarness();
    harness.search("Yankees");
    const pending = harness.request();
    harness.search(query);
    pending.resolve(response("Yankees", "New York Yankees"));
    await pending.finished;
    assertNoMatchups(harness.render());
    assert.equal(harness.state.options.execute, false);
  }
});

test("same-query cached data remains actionable while refreshing and surrounding whitespace is normalized", () => {
  const harness = commandHarness();
  harness.state.data = response("Yankees", "New York Yankees");
  harness.state.isLoading = true;
  const tree = harness.search("  Yankees  ");
  assert.equal(actionableMatchups(tree)[0].homeTeam, "New York Yankees");
  assert.equal(new URL(harness.state.url).searchParams.get("q"), "Yankees");
  assert.equal(tree.props.isLoading, true);
});

test("an unassociated or empty response cannot expose matchups", () => {
  const harness = commandHarness();
  harness.search("Yankees");
  harness.state.data = { results: response("Yankees", "New York Yankees").results };
  assertNoMatchups(harness.render());
  harness.state.data = { query: "Yankees", count: 0, results: [] };
  assertNoMatchups(harness.render());
});

// Exact small subset of the anonymous MLB response captured 2026-09-05 05:30 UTC
// at https://parlay-api.com/v1/try/baseball_mlb/odds. No source price was altered.
// Full response SHA256: ef8f80ae03d15934ff3b4b4861027429796456ea1ff50619fe5630c1eac29561.
// BetMGM actually supplied only Minnesota's outcome in this captured market.
const incompleteBoard = {
  id: "c6416c96f2df36a2d413c26e268d979e",
  home_team: "Chicago White Sox",
  away_team: "Minnesota Twins",
  commence_time: "2026-09-05T23:10:00Z",
  bookmakers: [
    {
      key: "fanduel",
      title: "FanDuel",
      markets: [
        {
          key: "h2h",
          outcomes: [
            { name: "Chicago White Sox", price: -124 },
            { name: "Minnesota Twins", price: 106 },
          ],
        },
      ],
    },
    {
      key: "betmgm",
      title: "BetMGM",
      markets: [{ key: "h2h", outcomes: [{ name: "Minnesota Twins", price: 1750 }] }],
    },
  ],
};

test("a genuinely missing source outcome is unavailable rather than another team's price", () => {
  const markdown = commandHarness().fullBoard(incompleteBoard);
  assert.ok(markdown.includes("| Book | Chicago White Sox | Minnesota Twins |"));
  assert.ok(markdown.includes("| FanDuel | -124 | +106 |"));
  assert.ok(markdown.includes("| BetMGM | Not available | +1750 |"));
  assert.ok(!markdown.includes("| BetMGM | +1750 | +1750 |"));
});

test("reordering source outcomes keeps prices under their named columns", () => {
  const reordered = structuredClone(incompleteBoard);
  reordered.bookmakers[0].markets[0].outcomes.reverse();
  const markdown = commandHarness().fullBoard(reordered);
  assert.ok(markdown.includes("| Book | Minnesota Twins | Chicago White Sox |"));
  assert.ok(markdown.includes("| FanDuel | +106 | -124 |"));
  assert.ok(markdown.includes("| BetMGM | +1750 | Not available |"));
});
