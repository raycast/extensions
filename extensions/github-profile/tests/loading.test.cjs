const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const test = require("node:test");
const ts = require("typescript");

// The fixtures never read Raycast preferences or send authenticated requests.
function loadSource(entry, stubs, deadline = AbortSignal) {
  const modules = new Map();
  function load(filename) {
    if (modules.has(filename)) return modules.get(filename).exports;
    const module = { exports: {} };
    modules.set(filename, module);
    const nativeRequire = createRequire(filename);
    const requireSource = (name) => {
      if (Object.hasOwn(stubs, name)) return stubs[name];
      if (name.startsWith(".")) {
        const base = path.resolve(path.dirname(filename), name);
        const source = [base + ".ts", base + ".tsx"].find(fs.existsSync);
        if (source) return load(source);
      }
      return nativeRequire(name);
    };
    const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    });
    new Function("require", "module", "exports", "AbortSignal", outputText)(
      requireSource,
      module,
      module.exports,
      deadline,
    );
    return module.exports;
  }
  return load(path.resolve(__dirname, "..", entry));
}

const profile = {
  id: 1,
  login: "fixture-user",
  name: "Fixture User",
  bio: "This biography has loaded.",
  followers: 4,
  following: 2,
  public_repos: 1,
  created_at: "2020-01-01T00:00:00Z",
  html_url: "https://github.com/fixture-user",
};
const repositories = [
  { id: 2, name: "loaded-repository", html_url: "https://github.com/fixture-user/loaded-repository" },
];
const contributions = { contributionCalendar: { totalContributions: 0, weeks: [] } };
const ready = (data) => ({ data, isLoading: false });
const pending = { isLoading: true };
const failed = (message) => ({ isLoading: false, error: new Error(message) });

function render(states) {
  const element = (type, props) => ({ type, props });
  const Action = Object.assign(() => {}, { OpenInBrowser: "open", CopyToClipboard: "copy", Push: "push" });
  const { default: Command } = loadSource("src/show-github-profile.tsx", {
    "react/jsx-runtime": { jsx: element, jsxs: element },
    "@raycast/api": {
      Action,
      ActionPanel: "actions",
      Detail: "detail",
      Icon: {},
      environment: { appearance: "light" },
      getPreferenceValues: () => ({ username: "fixture-user" }),
      openExtensionPreferences: () => {},
    },
    "@raycast/utils": {
      useCachedPromise: (fn) => ({ ...states[fn.name], revalidate: async () => {} }),
    },
  });
  return Command();
}

test("A stalled contribution request does not hide the profile or repositories.", () => {
  const view = render({
    fetchUserProfile: ready(profile),
    fetchUserRepositories: ready(repositories),
    fetchContributionData: pending,
  });
  assert.match(view.props.markdown, /This biography has loaded/);
  assert.match(view.props.markdown, /loaded-repository/);
});

test("A stalled profile request does not hide repositories that have loaded.", () => {
  const view = render({
    fetchUserProfile: pending,
    fetchUserRepositories: ready(repositories),
    fetchContributionData: ready(contributions),
  });
  assert.match(view.props.markdown, /loaded-repository/);
});

test("A refresh keeps previously loaded content visible.", () => {
  const view = render({
    fetchUserProfile: { ...ready(profile), isLoading: true },
    fetchUserRepositories: { ...ready(repositories), isLoading: true },
    fetchContributionData: { ...ready(contributions), isLoading: true },
  });
  assert.match(view.props.markdown, /This biography has loaded/);
  assert.match(view.props.markdown, /loaded-repository/);
});

test("An optional request failure leaves successful sections visible.", () => {
  const view = render({
    fetchUserProfile: ready(profile),
    fetchUserRepositories: failed("The repository request timed out."),
    fetchContributionData: failed("The contribution request timed out."),
  });
  assert.match(view.props.markdown, /This biography has loaded/);
  assert.match(view.props.markdown, /The repository request timed out/);
  assert.match(view.props.markdown, /The contribution request timed out/);
  assert.doesNotMatch(view.props.markdown, /total 0/);
  assert.equal(view.props.isLoading, false);
});

test("The main profile does not load third-party chart images.", () => {
  const view = render({
    fetchUserProfile: ready(profile),
    fetchUserRepositories: ready(repositories),
    fetchContributionData: ready(contributions),
  });
  assert.doesNotMatch(view.props.markdown, /thumbnail\.png/);
  assert.ok(view.props.actions.props.children.some((child) => child?.props?.title === "Show Public Activity Charts"));
});

function loadApi(axios, preferences = { githubToken: "fixture-only" }) {
  return loadSource(
    "src/api/github.ts",
    {
      "@raycast/api": { getPreferenceValues: () => preferences },
      "@raycast/utils": { showFailureToast: () => {} },
      axios,
    },
    {
      timeout: (milliseconds) => {
        assert.equal(milliseconds, 15000);
        return AbortSignal.timeout(10);
      },
    },
  );
}

for (const operation of ["fetchUserProfile", "fetchUserRepositories", "fetchContributionData"]) {
  test(`A stalled ${operation} request terminates with a retryable timeout.`, async () => {
    const stalled = (...args) =>
      new Promise((resolve, reject) => {
        const config = args.at(-1);
        assert.equal(config.timeout, 15000);
        config.signal?.addEventListener("abort", () => reject({ isAxiosError: true, code: "ERR_CANCELED" }));
      });
    const api = loadApi({ get: stalled, post: stalled, isAxiosError: (error) => error.isAxiosError === true });
    let timer;
    try {
      await Promise.race([
        assert.rejects(api[operation]("fixture-user"), /15 seconds/),
        new Promise((resolve, reject) => {
          timer = setTimeout(() => reject(new Error("The request did not terminate.")), 100);
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  });
}

test("A missing token never produces fabricated contribution data.", async () => {
  const api = loadApi({}, {});
  await assert.rejects(api.fetchContributionData("fixture-user"), /token/i);
});

test("GraphQL failures do not become a successful zero-contribution calendar.", async () => {
  const api = loadApi({
    post: async () => ({ data: { errors: [{ message: "The fixture query failed." }] } }),
    isAxiosError: () => false,
  });
  await assert.rejects(api.fetchContributionData("fixture-user"), /contribution/i);
});

test("Successful GitHub responses preserve profile, repository, and contribution values.", async () => {
  const calendar = {
    totalContributions: 7,
    weeks: [{ contributionDays: [{ date: "2026-11-13", contributionCount: 7, color: "#216e39" }] }],
  };
  const api = loadApi({
    get: async (url) => ({ data: url.includes("/repos?") ? repositories : profile }),
    post: async (url, body) => {
      assert.deepEqual(body.variables, { username: "fixture-user" });
      return { data: { data: { user: { contributionsCollection: { contributionCalendar: calendar } } } } };
    },
    isAxiosError: () => false,
  });
  assert.deepEqual(await api.fetchUserProfile("fixture-user"), profile);
  assert.deepEqual(await api.fetchUserRepositories("fixture-user"), repositories);
  assert.deepEqual(await api.fetchContributionData("fixture-user"), {
    contributionCalendar: {
      totalContributions: 7,
      weeks: [{ contributionDays: [{ date: "2026-11-13", count: 7, level: 4 }] }],
    },
  });
});

test("Authentication failures produce recovery instructions without raw request details.", async () => {
  const api = loadApi({
    get: async () => {
      throw { isAxiosError: true, response: { status: 401 }, message: "Raw request details." };
    },
    isAxiosError: (error) => error.isAxiosError === true,
  });
  await assert.rejects(api.fetchUserProfile("fixture-user"), (error) => {
    assert.match(error.message, /token.*preferences/);
    assert.doesNotMatch(error.message, /Raw request details/);
    return true;
  });
});

test("The contribution heatmap appears before the profile and repositories.", () => {
  const calendar = {
    contributionCalendar: {
      totalContributions: 7,
      weeks: [{ contributionDays: [{ date: "2026-11-13", count: 7, level: 4 }] }],
    },
  };
  const view = render({
    fetchUserProfile: ready(profile),
    fetchUserRepositories: ready(repositories),
    fetchContributionData: ready(calendar),
  });
  assert.match(view.props.markdown.trimStart(), /^<img alt="Contribution Heatmap"/);
  assert.ok(view.props.markdown.indexOf("Contribution Heatmap") < view.props.markdown.indexOf("This biography"));
  assert.ok(view.props.actions.props.children.some((child) => child?.props?.title === "Browse Repositories"));
});

const { summarizeContributions } = loadSource("src/utils/contributionStats.ts", {});
const day = (date, count) => ({ date, count, level: count ? 1 : 0 });

test("Contribution summaries exclude future dates and use an inclusive 30-day window.", () => {
  const summary = summarizeContributions(
    [
      { contributionDays: [day("2026-10-14", 100), day("2026-10-15", 10)] },
      { contributionDays: [day("2026-11-11", 2), day("2026-11-12", 3), day("2026-11-13", 0), day("2026-11-14", 999)] },
    ],
    new Date("2026-11-13T12:00:00Z"),
  );
  assert.deepEqual(summary, { total: 115, last30Days: 15, activeDays: 4, currentStreak: 2, longestStreak: 2 });
});

test("A missing day breaks a streak even when adjacent records have contributions.", () => {
  const summary = summarizeContributions(
    [{ contributionDays: [day("2026-11-10", 1), day("2026-11-12", 1), day("2026-11-13", 1)] }],
    new Date("2026-11-13T12:00:00Z"),
  );
  assert.equal(summary.currentStreak, 2);
  assert.equal(summary.longestStreak, 2);
});

test("A completed inactive day ends the current streak.", () => {
  const summary = summarizeContributions(
    [{ contributionDays: [day("2026-11-10", 1), day("2026-11-11", 1), day("2026-11-12", 0)] }],
    new Date("2026-11-13T12:00:00Z"),
  );
  assert.equal(summary.currentStreak, 0);
  assert.equal(summary.longestStreak, 2);
});

test("A partial calendar week keeps Wednesday in the Wednesday row.", () => {
  const { generateContributionSVG } = loadSource("src/utils/contributionUtils.ts", {});
  const svg = decodeURIComponent(generateContributionSVG([{ contributionDays: [day("2026-11-11", 2)] }]).split(",")[1]);
  assert.match(svg, /<rect x="50" y="180" width="9" height="9"/);
  assert.match(svg, /viewBox="0 0 720 270"/);
});

test("Profile text cannot introduce additional image requests through Markdown.", () => {
  const view = render({
    fetchUserProfile: ready({ ...profile, bio: "![External image](https://example.invalid/image.png)" }),
    fetchUserRepositories: ready(repositories),
    fetchContributionData: ready(contributions),
  });
  assert.doesNotMatch(view.props.markdown, /!\[External image\]\(/);
  assert.match(view.props.markdown, /External image/);
});
