const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

// Render the actual command with inert Raycast elements. The hook returns
// controlled responses so request order and keepPreviousData are deterministic.
// No Raycast installation, API requests or credentials are used; the price fixture is a saved public response.
const sourceRoot = process.env.SPORTS_ODDS_TEST_SOURCE || path.resolve(__dirname, "../src");
const compiled = Object.fromEntries(
  ["api", "search-odds", "team-aliases"].map((name) => {
    const filename = path.join(sourceRoot, name + (name === "search-odds" ? ".tsx" : ".ts"));
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
  const element = (type, props, key) => ({ type, props: props || {}, key });
  const raycast = {
    Action: { Push: "Action.Push", OpenInBrowser: "Action.OpenInBrowser", CopyToClipboard: "Action.CopyToClipboard" },
    ActionPanel: "ActionPanel",
    Detail: Object.assign(() => {}, { Metadata: Object.assign(() => {}, { Label: "Label", Separator: "Separator" }) }),
    getPreferenceValues: () => ({ apiKey: state.apiKey }),
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
      if (["./api", "./team-aliases"].includes(specifier)) return load(specifier.slice(2));
      assert.ok(Object.hasOwn(imports, specifier), "Unexpected runtime dependency: " + specifier);
      return imports[specifier];
    };
    // Expose the private formatter only inside this isolated test module.
    const formatterExport =
      name === "search-odds"
        ? "\nmodule.exports.formatFullBoard = fullBoardMarkdown; module.exports.ConsensusBestLines = ConsensusBestLines; module.exports.FullOddsBoard = FullOddsBoard; module.exports.GameLines = GameLines;"
        : "";
    vm.runInNewContext(compiled[name] + formatterExport, { module, exports: module.exports, require: requireModule });
    return module.exports;
  }
  const command = load("search-odds").default;
  return {
    state,
    api: load("api"),
    keyless: (game) => load("search-odds").ConsensusBestLines({ game }),
    keyed: (game) => load("search-odds").FullOddsBoard({ game, apiKey: "synthetic-test-key" }),
    lines: (game) => load("search-odds").GameLines({ game }),
    keyedComponent: load("search-odds").FullOddsBoard,
    keylessComponent: load("search-odds").ConsensusBestLines,
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

// Synthetic identities/times isolate matching behavior, not data coverage.
function gameResult(
  home = "Boston Red Sox",
  away = "Los Angeles Angels",
  time = "2026-09-08T23:10:00Z",
  sport = "baseball_mlb",
) {
  return { type: "game", sport_key: sport, sport_title: sport, home_team: home, away_team: away, commence_time: time };
}

function oddsEvent(result, id) {
  return { ...result, id, event_id: id, bookmakers: [] };
}

test("the actual keyless request stays within the command-center limit", () => {
  const h = commandHarness();
  h.keyless(h.api.dedupeGames([gameResult()])[0]);
  const url = new URL(h.state.url);
  assert.equal(url.pathname, "/live/api/command_center");
  assert.equal(url.searchParams.get("limit"), "50");
  assert.equal(h.state.options, undefined);
});

test("BOS/LAA aliases dedupe with canonical names in either source order and match either board", () => {
  for (const reversed of [false, true]) {
    const h = commandHarness();
    const rows = [gameResult("BOS", "LAA"), gameResult()];
    if (reversed) rows.reverse();
    const games = h.api.dedupeGames(rows);
    assert.equal(games.length, 1);
    assert.equal(games[0].homeTeam, "Boston Red Sox");
    assert.equal(games[0].awayTeam, "Los Angeles Angels");
    const event = oddsEvent(gameResult(), "matching-event");
    assert.equal(h.api.findEvent([event], games[0]), event);
    const aliasEvent = oddsEvent(gameResult("BOS", "LAA"), "alias-event");
    assert.equal(h.api.findEvent([aliasEvent], games[0]), aliasEvent);
  }
});

test("aliases are sport-specific and unknown names require exact full identity", () => {
  const api = commandHarness().api;
  assert.equal(api.canonicalTeam("BOS", "baseball_mlb"), "Boston Red Sox");
  assert.equal(api.canonicalTeam("BOS", "basketball_nba"), "Boston Celtics");
  const target = api.dedupeGames([gameResult("United", "City", undefined, "soccer_test")])[0];
  assert.equal(
    api.findEvent([oddsEvent(gameResult("Manchester United", "City", undefined, "soccer_test"), "wrong")], target),
    undefined,
  );
  assert.equal(
    api.findEvent([oddsEvent(gameResult("United", "City", undefined, "soccer_other"), "wrong-sport")], target),
    undefined,
  );
});

test("Lakers/Clippers and Yankees/Mets against the same opponent remain distinct with their own times", () => {
  const h = commandHarness();
  for (const [sport, a, b, opponent] of [
    ["basketball_nba", "Los Angeles Lakers", "Los Angeles Clippers", "Boston Celtics"],
    ["baseball_mlb", "New York Yankees", "New York Mets", "Boston Red Sox"],
  ]) {
    const rows = [
      gameResult(a, opponent, "2026-09-08T18:00:00Z", sport),
      gameResult(b, opponent, "2026-09-09T19:00:00Z", sport),
    ];
    const games = h.api.dedupeGames(rows);
    assert.equal(games.length, 2);
    assert.equal(games[0].commenceTime.getTime(), Date.parse(rows[0].commence_time));
    assert.equal(games[1].commenceTime.getTime(), Date.parse(rows[1].commence_time));
    const events = rows.map((r, i) => oddsEvent(r, String(i)));
    assert.equal(h.api.findEvent(events, games[0]), events[0]);
    assert.equal(h.api.findEvent(events, games[1]), events[1]);
  }
});

test("same teams on different dates and same-day doubleheaders remain separately actionable", () => {
  const h = commandHarness();
  const times = ["2026-09-08T18:00:00Z", "2026-09-08T23:00:00Z", "2026-09-09T18:00:00Z"];
  const rows = times.map((time) => gameResult("BOS", "LAA", time));
  h.state.data = { query: "Boston", results: rows };
  const items = findElements(h.search("Boston"), "List.Item");
  assert.equal(items.length, 3);
  assert.equal(new Set(items.map((item) => item.key)).size, 3);
  const games = h.api.dedupeGames(rows);
  const events = times.map((time, i) => oddsEvent(gameResult(undefined, undefined, time), String(i)));
  for (let i = 0; i < games.length; i++) {
    assert.equal(h.api.findEvent(events.slice().reverse(), games[i]), events[i]);
  }
});

test("missing kickoffs do not borrow a dated row's time or select an ambiguous event", () => {
  const api = commandHarness().api;
  const undated = { ...gameResult("BOS", "LAA"), commence_time: undefined };
  const games = api.dedupeGames([undated, gameResult()]);
  assert.equal(games.length, 2);
  assert.equal(games[0].commenceTime, undefined);
  const a = oddsEvent(gameResult(), "a");
  const b = oddsEvent(gameResult(undefined, undefined, "2026-09-09T23:10:00Z"), "b");
  assert.equal(api.findEvent([a, b], games[0]), undefined);
  assert.equal(api.findEvent([a], games[0]), a);
  assert.equal(api.findEvent([b], games[1]), undefined);
});

test("equivalent UTC timestamp spellings dedupe independently of the process timezone", () => {
  const api = commandHarness().api;
  const games = api.dedupeGames([
    gameResult("BOS", "LAA", "2026-09-08 23:10:00"),
    gameResult(undefined, undefined, "2026-09-08T23:10:00"),
    gameResult(undefined, undefined, "2026-09-08T19:10:00-04:00"),
  ]);
  assert.equal(games.length, 1);
  assert.equal(games[0].commenceTime.toISOString(), "2026-09-08T23:10:00.000Z");
});

test("own-key flow resolves the selected dated alias fixture rather than the first opponent match", () => {
  const h = commandHarness();
  const target = h.api.dedupeGames([gameResult("BOS", "LAA")])[0];
  h.state.data = [
    oddsEvent(gameResult(undefined, undefined, "2026-09-09T23:10:00Z"), "wrong-date"),
    oddsEvent(gameResult(), "right-date"),
  ];
  const detail = h.keyed(target);
  assert.ok(detail.props.markdown.includes("Boston Red Sox"));
  assert.equal(
    findElements(detail.props.actions, "Action.CopyToClipboard").filter((el) => el.props.title === "Copy Event ID")[0]
      .props.content,
    "right-date",
  );
  assert.equal(h.state.options.headers["X-API-Key"], "synthetic-test-key");
  assert.ok(!h.state.url.includes("synthetic-test-key"));
});

test("both preference routes select their existing own-key or keyless board", () => {
  const h = commandHarness();
  const target = h.api.dedupeGames([gameResult()])[0];
  assert.equal(h.lines(target).type, h.keylessComponent);
  h.state.apiKey = "  synthetic-test-key  ";
  assert.equal(h.lines(target).type, h.keyedComponent);
  assert.equal(h.lines(target).props.apiKey, "synthetic-test-key");
});

test("a partial first bookmaker cannot hide another team's available price", () => {
  const board = structuredClone(incompleteBoard);
  board.bookmakers.reverse();
  const markdown = commandHarness().fullBoard(board);
  assert.ok(markdown.includes("| Book | Minnesota Twins | Chicago White Sox |"));
  assert.ok(markdown.includes("| BetMGM | +1750 | Not available |"));
  assert.ok(markdown.includes("| FanDuel | +106 | -124 |"));
});

test("each market unions outcome columns across all books, retaining genuine missing prices", () => {
  const board = {
    ...incompleteBoard,
    bookmakers: [
      {
        title: "First",
        markets: [
          { key: "spreads", outcomes: [{ name: "Home", point: -1.5, price: -110 }] },
          { key: "totals", outcomes: [{ name: "Over", point: 8.5, price: -105 }] },
        ],
      },
      {
        title: "Second",
        markets: [
          { key: "spreads", outcomes: [{ name: "Away", point: 1.5, price: -115 }] },
          { key: "totals", outcomes: [{ name: "Under", point: 8.5, price: -120 }] },
        ],
      },
      { title: "Empty", markets: [] },
    ],
  };
  const markdown = commandHarness().fullBoard(board);
  assert.ok(markdown.includes("| Book | Home | Away |"));
  assert.ok(markdown.includes("| First | -1.5 -110 | Not available |"));
  assert.ok(markdown.includes("| Second | Not available | +1.5 -115 |"));
  assert.ok(markdown.includes("| Book | Over | Under |"));
  assert.ok(markdown.includes("| First | 8.5 -105 | Not available |"));
  assert.ok(markdown.includes("| Second | Not available | 8.5 -120 |"));
  assert.ok(!markdown.includes("| Empty |"));
});

test("keyless alias selection uses the dated matching command-center event", () => {
  const h = commandHarness();
  const target = h.api.dedupeGames([gameResult("BOS", "LAA")])[0];
  const makeEvent = (date, id, price) => ({
    ...oddsEvent(gameResult(undefined, undefined, date), id),
    book_count: 1,
    max_gap_cents: 0,
    best_home: { bookmaker: "Fixture Book", price, alternatives: [] },
    best_away: { bookmaker: "Fixture Book", price: -110, alternatives: [] },
  });
  h.state.data = {
    games: [makeEvent("2026-09-09T23:10:00Z", "wrong-date", 999), makeEvent("2026-09-08T23:10:00Z", "right-date", 120)],
  };
  const detail = h.keyless(target);
  assert.ok(detail.props.markdown.includes("**+120**"));
  assert.ok(!detail.props.markdown.includes("+999"));
  const links = findElements(detail.props.actions, "Action.OpenInBrowser");
  assert.ok(links.some((link) => link.props.url.endsWith("/live/game/right-date")));
});
