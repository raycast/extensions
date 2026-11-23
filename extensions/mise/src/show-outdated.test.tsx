import { LaunchType, type LaunchProps } from "@raycast/api";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactTestInstance } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { homebrewMise } from "../test/homebrewMise";
import { Action, defaultPreferences, Detail, List, mocks } from "../test/raycast-api";
import { runAppleScript, useCachedPromiseFixtures } from "../test/raycast-utils";
import { flush, render } from "../test/render";
import * as exec from "./mise/exec";
import { listVulnerabilities, parseAudit, type Severity, type VulnerableTool } from "./mise/audit";
import { listOutdated, parseOutdated, parseUnchecked } from "./mise/outdated";
import * as version from "./mise/version";
import auditFixture from "./mise/fixtures/audit.json";
import outdatedFixture from "./mise/fixtures/outdated.json";
import inactiveFixture from "./mise/fixtures/outdated-inactive.json";
import notInstalledFixture from "./mise/fixtures/outdated-not-installed.json";
import Command from "./show-outdated";

const launch: LaunchProps = { arguments: {}, launchType: LaunchType.UserInitiated };
const uncheckedStderr = readFileSync(join(__dirname, "mise/fixtures/outdated-unchecked-stderr.txt"), "utf8");

describe("Show Outdated Tools", () => {
  it("lists each outdated tool as current → latest and writes the count as the command subtitle", async () => {
    useCachedPromiseFixtures.set(listOutdated, parseOutdated(outdatedFixture));
    const { root } = await render(<Command {...launch} />);
    const items = root.findAllByType(List.Item);

    expect(items.map((n) => [n.props.title, n.props.subtitle])).toEqual([
      ["gh", "2.100.0 → 2.101.0"],
      ["npm:wrangler", "4.131.1 → 4.131.2"],
      ["opencode", "1.18.30 → 1.18.31"],
      ["usage", "6.9.0 → 6.9.1"],
    ]);
    expect(items[0].props.accessories).toEqual([{ tag: "config.local.toml" }]);
    expect(mocks.updateCommandMetadata).toHaveBeenCalledWith({ subtitle: "4 outdated" });
  });

  it("reports All up to date when nothing is outdated", async () => {
    useCachedPromiseFixtures.set(listOutdated, parseOutdated({}));
    const { root } = await render(<Command {...launch} />);
    expect(root.findAllByType(List.Item)).toEqual([]);
    expect(root.findByType(List.EmptyView).props.title).toBe("All tools up to date");
    expect(mocks.updateCommandMetadata).toHaveBeenCalledWith({ subtitle: "All up to date" });
  });

  it("ignores a cached list from the previous release instead of crashing or claiming All up to date", async () => {
    const previousRelease = parseOutdated(outdatedFixture).tools;
    useCachedPromiseFixtures.set(listOutdated, previousRelease as never);
    const { root } = await render(<Command {...launch} />);
    expect(root.findAllByType(List.Item)).toEqual([]);
    expect(root.findAllByType(List.EmptyView)).toEqual([]);
    expect(root.findByType(List).props.isLoading).toBe(true);
    expect(mocks.updateCommandMetadata).not.toHaveBeenCalled();
  });

  it("lists the tools mise couldn't check under their own section with a Retry, not All up to date", async () => {
    useCachedPromiseFixtures.set(listOutdated, parseOutdated({}, uncheckedStderr));
    const { root } = await render(<Command {...launch} />);

    expect(root.findAllByType(List.EmptyView)).toEqual([]);
    const section = root.findByType(List.Section);
    expect(section.props).toMatchObject({ title: "Couldn't Check", subtitle: "2" });
    expect(section.findAllByType(List.Item).map((n) => [n.props.title, n.props.subtitle])).toEqual([
      ["asdf:unreachable", "1.0.0"],
      ["asdf:broken", "1.0.0"],
    ]);
    expect(mocks.updateCommandMetadata).toHaveBeenCalledWith({ subtitle: "2 unchecked" });

    const panel = await render(section.findAllByType(List.Item)[0].props.actions);
    await flush(() =>
      panel.root
        .findAllByType(Action)
        .find((n) => n.props.title === "Retry")
        ?.props.onAction(),
    );
    expect(useCachedPromiseFixtures.revalidateOf(listOutdated)).toHaveBeenCalledTimes(1);
  });

  it("lists outdated tools above the ones mise couldn't check", async () => {
    const { tools } = parseOutdated(outdatedFixture);
    useCachedPromiseFixtures.set(listOutdated, { tools, unchecked: parseUnchecked(uncheckedStderr) });
    const { root } = await render(<Command {...launch} />);

    expect(root.findAllByType(List.Item).map((n) => n.props.title)).toEqual([
      "gh",
      "npm:wrangler",
      "opencode",
      "usage",
      "asdf:unreachable",
      "asdf:broken",
    ]);
    expect(mocks.updateCommandMetadata).toHaveBeenCalledWith({ subtitle: "4 outdated, 2 unchecked" });
  });

  it("shows the requested version only when it is pinned, and nothing for an inactive install", async () => {
    const [gh] = parseOutdated(outdatedFixture).tools;
    const [inactive] = parseOutdated(inactiveFixture).tools;
    useCachedPromiseFixtures.set(listOutdated, {
      tools: [gh, { ...gh, name: "node", requested: "lts" }, inactive],
      unchecked: [],
    });
    const { root } = await render(<Command {...launch} />);
    const [latest, pinned, unconfigured] = root.findAllByType(List.Item);

    expect(latest.props.accessories).toEqual([{ tag: "config.local.toml" }]);
    expect(pinned.props.accessories).toEqual([
      { text: "lts", tooltip: "Requested version" },
      { tag: "config.local.toml" },
    ]);
    expect(unconfigured.props).toMatchObject({ subtitle: "2.99.0 → 2.101.0", accessories: [] });
  });

  it("shows not installed for a tool whose requested version is missing, and upgrades it by name", async () => {
    useCachedPromiseFixtures.set(listOutdated, parseOutdated(notInstalledFixture));
    const runMise = vi.spyOn(exec, "runMise").mockResolvedValue({ code: 0, stdout: "", stderr: "" });
    const { root } = await render(<Command {...launch} />);
    const node = root.findAllByType(List.Item).find((n) => n.props.title === "node");
    expect(node?.props).toMatchObject({
      subtitle: "not installed → 26.13.0",
      accessories: [{ text: "lts", tooltip: "Requested version" }, { tag: "config.toml" }],
    });

    const panel = await render(node?.props.actions);
    const upgrade = panel.root.findAllByType(Action).find((n) => n.props.title === "Upgrade");
    await flush(() => upgrade?.props.onAction());
    expect(runMise).toHaveBeenCalledWith(expect.anything(), ["upgrade", "node"], expect.anything());
  });

  it("lists a malformed entry as unreadable, counts it, and still upgrades it by name", async () => {
    useCachedPromiseFixtures.set(listOutdated, { tools: [{ name: "broken", malformed: true }], unchecked: [] });
    const runMise = vi.spyOn(exec, "runMise").mockResolvedValue({ code: 0, stdout: "", stderr: "" });
    const { root } = await render(<Command {...launch} />);
    const item = root.findByType(List.Item);
    expect(item.props).toMatchObject({ title: "broken", subtitle: "unreadable mise outdated entry", accessories: [] });
    expect(mocks.updateCommandMetadata).toHaveBeenCalledWith({ subtitle: "1 outdated" });

    const panel = await render(item.props.actions);
    const actions = panel.root.findAllByType(Action);
    expect(actions.map((n) => n.props.title)).not.toContain("Open Release Notes");
    await flush(() => actions.find((n) => n.props.title === "Upgrade")?.props.onAction());
    expect(runMise).toHaveBeenCalledWith(expect.anything(), ["upgrade", "broken"], expect.anything());
  });

  it("shows the error with a Retry that refetches when mise outdated fails", async () => {
    useCachedPromiseFixtures.fail(listOutdated, new Error("boom"));
    const { root } = await render(<Command {...launch} />);

    const empty = root.findByType(List.EmptyView);
    expect(empty.props).toMatchObject({ title: "Couldn't load from mise", description: "boom" });
    expect(root.findAllByType(List.Item)).toEqual([]);

    const panel = await render(empty.props.actions);
    await flush(() =>
      panel.root
        .findAllByType(Action)
        .find((n) => n.props.title === "Retry")
        ?.props.onAction(),
    );
    expect(useCachedPromiseFixtures.revalidateOf(listOutdated)).toHaveBeenCalledTimes(1);
  });

  it("renders MissingMise and a mise not found subtitle when the configured path does not exist", async () => {
    mocks.getPreferenceValues.mockReturnValue({ misePath: "/nonexistent/mise" });
    const { root } = await render(<Command {...launch} />);
    expect(root.findByType(Detail).props.markdown).toContain("curl https://mise.run");
    expect(mocks.updateCommandMetadata).toHaveBeenCalledWith({ subtitle: "mise not found" });
  });
});

describe("Show Outdated Tools scope", () => {
  it.each([
    ["2026.10.7", ["--global"]],
    ["2026.11.0", ["--global"]],
    ["2026.10.6", []],
    [undefined, []],
  ])("with mise %s, outdated, Upgrade and Run in Terminal pass %j", async (miseVersion, scope) => {
    vi.spyOn(version, "readVersion").mockResolvedValue(miseVersion ? { version: miseVersion } : undefined);
    const miseJson = vi
      .spyOn(exec, "miseJson")
      .mockImplementation(async (_location, _args, parse) => parse(outdatedFixture, ""));
    const runMise = vi.spyOn(exec, "runMise").mockResolvedValue({ code: 0, stdout: "", stderr: "" });
    const { root } = await render(<Command {...launch} />);
    expect(miseJson).toHaveBeenCalledWith(expect.anything(), ["outdated", ...scope], parseOutdated);

    const panel = await render(root.findAllByType(List.Item)[0].props.actions);
    const action = (title: string) => panel.root.findAllByType(Action).find((n) => n.props.title === title);
    await flush(() => action("Upgrade")?.props.onAction());
    expect(runMise).toHaveBeenLastCalledWith(expect.anything(), ["upgrade", ...scope, "gh"], expect.anything());
    await flush(() => action("Upgrade All in Terminal")?.props.onAction());
    expect(runAppleScript.mock.lastCall?.[0]).toContain(["/bin/sh upgrade", ...scope].join(" ") + '"');
    expect(action("Copy Upgrade Command")).toBeUndefined();
    const copy = panel.root.findAllByType(Action.CopyToClipboard).find((n) => n.props.title === "Copy Upgrade Command");
    expect(copy?.props.content).toBe(["mise upgrade", ...scope, "gh"].join(" "));
  });
});

describe("Show Outdated Tools mise update", () => {
  const makeHomebrewMise = homebrewMise();
  const updateItem = (root: ReactTestInstance) =>
    root.findAllByType(List.Item).find((n) => String(n.props.title).startsWith("mise "));

  it("puts a Homebrew mise update first, run with brew in the terminal and copyable", async () => {
    mocks.getPreferenceValues.mockReturnValue({ ...defaultPreferences, misePath: makeHomebrewMise() });
    vi.spyOn(version, "readVersion").mockResolvedValue({ version: "2026.10.15", latest: "2026.10.25" });
    useCachedPromiseFixtures.set(listOutdated, parseOutdated(outdatedFixture));
    const { root } = await render(<Command {...launch} />);

    const [first, ...tools] = root.findAllByType(List.Item);
    expect(first.props).toMatchObject({ title: "mise 2026.10.25 available", subtitle: "2026.10.15 → 2026.10.25" });
    expect(tools.map((n) => n.props.title)).toEqual(["gh", "npm:wrangler", "opencode", "usage"]);

    const panel = await render(first.props.actions);
    await flush(() =>
      panel.root
        .findAllByType(Action)
        .find((n) => n.props.title === "Update in Terminal")
        ?.props.onAction(),
    );
    expect(runAppleScript.mock.lastCall?.[0]).toContain('do script "brew upgrade mise"');
    expect(panel.root.findByType(Action.CopyToClipboard).props).toMatchObject({
      title: "Copy Command",
      content: "brew upgrade mise",
    });
  });

  it("links to the install docs when it cannot tell how mise was installed", async () => {
    vi.spyOn(version, "readVersion").mockResolvedValue({ version: "2026.10.15", latest: "2026.10.25" });
    useCachedPromiseFixtures.set(listOutdated, { tools: [], unchecked: [] });
    const { root } = await render(<Command {...launch} />);

    const panel = await render(updateItem(root)?.props.actions);
    expect(panel.root.findByType(Action.OpenInBrowser).props.url).toBe("https://mise.jdx.dev/installing-mise.html");
    expect(panel.root.findAllByType(Action.CopyToClipboard)).toEqual([]);
  });

  it.each([
    ["up to date", { version: "2026.10.25", latest: "2026.10.25" }],
    ["without latest", { version: "2026.10.15" }],
    ["of unknown version", undefined],
  ])("shows nothing for a mise %s", async (_, miseVersion) => {
    vi.spyOn(version, "readVersion").mockResolvedValue(miseVersion);
    useCachedPromiseFixtures.set(listOutdated, { tools: [], unchecked: [] });
    const { root } = await render(<Command {...launch} />);
    expect(updateItem(root)).toBeUndefined();
    expect(root.findByType(List.EmptyView).props.title).toBe("All tools up to date");
  });

  it("keeps the load error visible instead of the update when mise outdated fails", async () => {
    vi.spyOn(version, "readVersion").mockResolvedValue({ version: "2026.10.15", latest: "2026.10.25" });
    useCachedPromiseFixtures.fail(listOutdated, new Error("boom"));
    const { root } = await render(<Command {...launch} />);
    expect(updateItem(root)).toBeUndefined();
    expect(root.findByType(List.EmptyView).props.title).toBe("Couldn't load from mise");
  });
  it("keeps the load error visible when the check fails over a list cached by the previous release", async () => {
    vi.spyOn(version, "readVersion").mockResolvedValue({ version: "2026.10.15", latest: "2026.10.25" });
    useCachedPromiseFixtures.fail(listOutdated, new Error("boom"), parseOutdated(outdatedFixture).tools);
    const { root } = await render(<Command {...launch} />);
    expect(updateItem(root)).toBeUndefined();
    expect(root.findByType(List.EmptyView).props.title).toBe("Couldn't load from mise");
  });
});

describe("Show Outdated Tools vulnerabilities", () => {
  const withAudit = (miseVersion: string | undefined) =>
    vi.spyOn(version, "readVersion").mockResolvedValue(miseVersion ? { version: miseVersion } : undefined);
  const vulnerableSection = (root: ReactTestInstance) =>
    root.findAllByType(List.Section).find((n) => n.props.title === "Vulnerable");
  const actionsOf = async (item: ReactTestInstance) => (await render(item.props.actions)).root;

  it("lists each vulnerable tool version with its advisory count, severity and fixed version", async () => {
    withAudit("2026.11.12");
    useCachedPromiseFixtures.set(listOutdated, parseOutdated(outdatedFixture));
    useCachedPromiseFixtures.set(listVulnerabilities, parseAudit(auditFixture));
    const { root } = await render(<Command {...launch} />);

    const section = vulnerableSection(root);
    expect(section?.props.subtitle).toBe("2");
    const [lodash, jq] = section?.findAllByType(List.Item) ?? [];
    expect([lodash.props.title, lodash.props.subtitle]).toEqual(["npm:lodash", "4.17.15"]);
    expect(lodash.props.accessories).toEqual([
      expect.objectContaining({ text: "3", tooltip: "3 advisories" }),
      { tag: { value: "high", color: "Red" } },
      { text: "fixed in 4.17.21" },
    ]);
    expect([jq.props.title, jq.props.subtitle]).toEqual(["jq", "1.8.1"]);
    expect(jq.props.accessories).toEqual([
      expect.objectContaining({ text: "2" }),
      { tag: { value: "unknown", color: "SecondaryText" } },
    ]);
    expect(root.findAllByType(List.Item).map((n) => n.props.title)).not.toContain("node");
  });

  it("lists vulnerable tools above the outdated ones", async () => {
    withAudit("2026.11.12");
    useCachedPromiseFixtures.set(listOutdated, parseOutdated(outdatedFixture));
    useCachedPromiseFixtures.set(listVulnerabilities, parseAudit(auditFixture));
    const { root } = await render(<Command {...launch} />);
    expect(root.findAllByType(List.Item).map((n) => n.props.title)).toEqual([
      "npm:lodash",
      "jq",
      "gh",
      "npm:wrangler",
      "opencode",
      "usage",
    ]);
    const outdated = root.findAllByType(List.Section).find((n) => n.props.title === "Outdated");
    expect(outdated?.findAllByType(List.Item).map((n) => n.props.title)).toEqual([
      "gh",
      "npm:wrangler",
      "opencode",
      "usage",
    ]);
  });

  it("colors the tag and the warning icon by the highest severity, with no severity as a yellow warning", async () => {
    withAudit("2026.11.12");
    useCachedPromiseFixtures.set(listOutdated, parseOutdated({}));
    const audit = (severity: Severity): VulnerableTool => ({
      tool: severity,
      version: "1",
      advisories: [{ id: "x", aliases: [], summary: "", fixed: [], severity }],
      severity,
    });
    const unrated: VulnerableTool = { ...audit("low"), tool: "unrated", severity: undefined };
    useCachedPromiseFixtures.set(listVulnerabilities, [audit("low"), audit("medium"), audit("critical"), unrated]);
    const { root } = await render(<Command {...launch} />);
    const items = root.findAllByType(List.Item);
    expect(items.map((n) => (n.props.accessories as { tag?: unknown }[])[1].tag)).toEqual([
      { value: "low", color: "Yellow" },
      { value: "medium", color: "Orange" },
      { value: "critical", color: "Red" },
      { value: "unknown", color: "SecondaryText" },
    ]);
    expect(items.map((n) => n.props.icon)).toEqual([
      { source: "Warning", tintColor: "Yellow" },
      { source: "Warning", tintColor: "Orange" },
      { source: "Warning", tintColor: "Red" },
      { source: "Warning", tintColor: "Yellow" },
    ]);
  });

  it("leaves the section off and never runs the audit on mise before 2026.11.12", async () => {
    withAudit("2026.11.11");
    useCachedPromiseFixtures.set(listOutdated, parseOutdated(outdatedFixture));
    useCachedPromiseFixtures.set(listVulnerabilities, parseAudit(auditFixture));
    const { root } = await render(<Command {...launch} />);
    expect(vulnerableSection(root)).toBeUndefined();
    expect(root.findAllByType(List.Item).map((n) => n.props.title)).not.toContain("jq");

    const panel = await actionsOf(root.findAllByType(List.Item)[0]);
    await flush(() =>
      panel
        .findAllByType(Action)
        .find((n) => n.props.title === "Refresh")
        ?.props.onAction(),
    );
    expect(useCachedPromiseFixtures.revalidateOf(listOutdated)).toHaveBeenCalledTimes(1);
    expect(useCachedPromiseFixtures.revalidateOf(listVulnerabilities)).not.toHaveBeenCalled();
  });

  it("keeps the outdated load error and its Retry visible when only the audit succeeds", async () => {
    withAudit("2026.11.12");
    useCachedPromiseFixtures.fail(listOutdated, new Error("boom"));
    useCachedPromiseFixtures.set(listVulnerabilities, parseAudit(auditFixture));
    const { root } = await render(<Command {...launch} />);
    expect(vulnerableSection(root)).toBeUndefined();
    expect(root.findAllByType(List.Item)).toEqual([]);
    expect(root.findByType(List.EmptyView).props.title).toBe("Couldn't load from mise");
  });

  it("keeps the outdated list and shows no section when the audit fails", async () => {
    withAudit("2026.11.12");
    useCachedPromiseFixtures.set(listOutdated, parseOutdated(outdatedFixture));
    useCachedPromiseFixtures.fail(listVulnerabilities, new Error("offline"));
    const { root } = await render(<Command {...launch} />);
    expect(vulnerableSection(root)).toBeUndefined();
    expect(root.findAllByType(List.Item)).toHaveLength(4);
  });

  it("does not claim All tools up to date while a tool is vulnerable", async () => {
    withAudit("2026.11.12");
    useCachedPromiseFixtures.set(listOutdated, parseOutdated({}));
    useCachedPromiseFixtures.set(listVulnerabilities, parseAudit(auditFixture));
    const { root } = await render(<Command {...launch} />);
    expect(root.findAllByType(List.EmptyView)).toEqual([]);
    expect(root.findAllByType(List.Item)).toHaveLength(2);

    useCachedPromiseFixtures.set(listVulnerabilities, []);
    const clean = await render(<Command {...launch} />);
    expect(clean.root.findByType(List.EmptyView).props.title).toBe("All tools up to date");
  });

  it("keeps the second action read-only: Copy Upgrade Command, not an upgrade", async () => {
    withAudit("2026.11.12");
    useCachedPromiseFixtures.set(listOutdated, parseOutdated({}));
    useCachedPromiseFixtures.set(listVulnerabilities, parseAudit(auditFixture));
    const { root } = await render(<Command {...launch} />);
    const panel = await actionsOf(root.findAllByType(List.Item)[0]);
    const titled = panel.findAll((n) => typeof n.props.title === "string" && typeof n.type !== "string");
    expect([...new Set(titled.map((n) => n.props.title))].slice(0, 2)).toEqual([
      "Show Advisories",
      "Copy Upgrade Command",
    ]);
    expect(panel.findByType(Action.CopyToClipboard).props.content).toBe("mise upgrade --vulnerable --global");
  });

  it("upgrades vulnerable tools, in the terminal too, and refreshes the audit afterwards", async () => {
    withAudit("2026.11.12");
    useCachedPromiseFixtures.set(listOutdated, parseOutdated({}));
    useCachedPromiseFixtures.set(listVulnerabilities, parseAudit(auditFixture));
    const runMise = vi.spyOn(exec, "runMise").mockResolvedValue({ code: 0, stdout: "", stderr: "" });
    const { root } = await render(<Command {...launch} />);
    const panel = await actionsOf(root.findAllByType(List.Item)[0]);
    const action = (title: string) => panel.findAllByType(Action).find((n) => n.props.title === title);

    await flush(() => action("Upgrade Vulnerable Tools")?.props.onAction());
    expect(runMise).toHaveBeenCalledWith(expect.anything(), ["upgrade", "--vulnerable", "--global"], expect.anything());
    expect(useCachedPromiseFixtures.revalidateOf(listVulnerabilities)).toHaveBeenCalledTimes(1);
    expect(useCachedPromiseFixtures.revalidateOf(listOutdated)).toHaveBeenCalledTimes(1);

    await flush(() => action("Upgrade Vulnerable Tools in Terminal")?.props.onAction());
    expect(runAppleScript.mock.lastCall?.[0]).toContain("/bin/sh upgrade --vulnerable --global");

    await flush(() => action("Refresh")?.props.onAction());
    expect(useCachedPromiseFixtures.revalidateOf(listVulnerabilities)).toHaveBeenCalledTimes(2);
  });

  it("shows the advisories with their ID, severity and aliases searchable, and opens or copies each", async () => {
    withAudit("2026.11.12");
    useCachedPromiseFixtures.set(listOutdated, parseOutdated({}));
    useCachedPromiseFixtures.set(listVulnerabilities, parseAudit(auditFixture));
    const { root } = await render(<Command {...launch} />);
    const panel = await actionsOf(root.findAllByType(List.Item)[0]);
    const push = panel.findByType(Action.Push);
    expect(push.props.title).toBe("Show Advisories");

    const advisories = (await render(push.props.target)).root;
    const [medium] = advisories.findAllByType(List.Item);
    expect(advisories.findAllByType(List.Item)).toHaveLength(3);
    expect(medium.props).toMatchObject({
      title: "Regular Expression Denial of Service (ReDoS) in lodash",
      subtitle: "GHSA-29mw-wpgm-hmr9",
      keywords: [
        "Regular Expression Denial of Service (ReDoS) in lodash",
        "GHSA-29mw-wpgm-hmr9",
        "CVE-2020-28500",
        "medium",
      ],
    });
    const item = await actionsOf(medium);
    expect(item.findByType(Action.OpenInBrowser).props.url).toBe("https://osv.dev/vulnerability/GHSA-29mw-wpgm-hmr9");
    expect(item.findByType(Action.CopyToClipboard).props).toMatchObject({
      title: "Copy ID",
      content: "GHSA-29mw-wpgm-hmr9",
    });
  });
});
