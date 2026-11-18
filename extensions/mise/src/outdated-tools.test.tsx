import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactTestInstance } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { homebrewMise } from "../test/homebrewMise";
import { defaultPreferences, Icon, MenuBarExtra, mocks } from "../test/raycast-api";
import { runAppleScript, showFailureToast, useCachedPromiseFixtures } from "../test/raycast-utils";
import { flush, render } from "../test/render";
import { listOutdated, parseOutdated } from "./mise/outdated";
import * as version from "./mise/version";
import outdatedFixture from "./mise/fixtures/outdated.json";
import notInstalledFixture from "./mise/fixtures/outdated-not-installed.json";
import Command from "./outdated-tools";

const uncheckedStderr = readFileSync(join(__dirname, "mise/fixtures/outdated-unchecked-stderr.txt"), "utf8");

describe("Tools Menu Bar", () => {
  it("shows the count and hands each tool to Show Outdated Tools", async () => {
    useCachedPromiseFixtures.set(listOutdated, parseOutdated(outdatedFixture));
    const { root } = await render(<Command />);
    const menu = root.findByType(MenuBarExtra);
    expect(menu.props).toMatchObject({ title: "4", tooltip: "mise: 4 outdated tools" });

    const gh = menu.findAllByType(MenuBarExtra.Item).find((n) => n.props.title === "gh");
    expect(gh?.props.subtitle).toBe("2.100.0 → 2.101.0");
    await flush(() => gh?.props.onAction());
    expect(mocks.launchCommand).toHaveBeenCalledWith({
      name: "show-outdated",
      type: "userInitiated",
      context: { upgrade: "gh" },
    });
  });

  it("lists a tool whose requested version is not installed, and a malformed entry, without failing", async () => {
    const [jq, node] = parseOutdated(notInstalledFixture).tools;
    useCachedPromiseFixtures.set(listOutdated, {
      tools: [jq, node, { name: "broken", malformed: true }],
      unchecked: [],
    });
    const { root } = await render(<Command />);
    const menu = root.findByType(MenuBarExtra);
    expect(menu.props).toMatchObject({ title: "3", tooltip: "mise: 3 outdated tools" });

    const items = menu.findAllByType(MenuBarExtra.Item);
    expect(items.slice(0, 3).map((n) => [n.props.title, n.props.subtitle])).toEqual([
      ["jq", "not installed → 1.7"],
      ["node", "not installed → 26.13.0"],
      ["broken", "unreadable mise outdated entry"],
    ]);
    await flush(() => items[1].props.onAction());
    expect(mocks.launchCommand).toHaveBeenCalledWith({
      name: "show-outdated",
      type: "userInitiated",
      context: { upgrade: "node" },
    });
  });

  it("shows a failure toast when Show Outdated Tools cannot be launched", async () => {
    useCachedPromiseFixtures.set(listOutdated, parseOutdated(outdatedFixture));
    const error = new Error("Command is disabled");
    mocks.launchCommand.mockRejectedValueOnce(error);
    const { root } = await render(<Command />);
    const open = root
      .findByType(MenuBarExtra)
      .findAllByType(MenuBarExtra.Item)
      .find((n) => n.props.title === "Open Outdated Tools");
    await flush(() => open?.props.onAction());
    expect(showFailureToast).toHaveBeenCalledWith(error, { title: "Could not open Show Outdated Tools" });
  });

  it("shows the failure with a retry when mise outdated fails, not an up-to-date menu", async () => {
    useCachedPromiseFixtures.fail(listOutdated, new Error("GitHub rate limit exceeded"));
    const { root } = await render(<Command />);
    const menu = root.findByType(MenuBarExtra);
    expect(menu.props).toMatchObject({ title: undefined, tooltip: "mise: could not check outdated tools" });
    const titles = menu.findAllByType(MenuBarExtra.Item).map((n) => n.props.title);
    expect(titles).not.toContain("All tools up to date");
    const failure = menu
      .findAllByType(MenuBarExtra.Item)
      .find((n) => n.props.title === "Couldn't check outdated tools");
    expect(failure?.props.subtitle).toBe("GitHub rate limit exceeded");
    await flush(() => failure?.props.onAction());
    expect(useCachedPromiseFixtures.revalidateOf(listOutdated)).toHaveBeenCalled();
  });

  it("keeps loading over a cached list from the previous release, without claiming All tools up to date", async () => {
    useCachedPromiseFixtures.set(listOutdated, parseOutdated(outdatedFixture).tools as never);
    const { root } = await render(<Command />);
    const menu = root.findByType(MenuBarExtra);
    expect(menu.props).toMatchObject({ title: undefined, isLoading: true });
    expect(menu.findAllByType(MenuBarExtra.Item).map((n) => n.props.title)).not.toContain("All tools up to date");
  });

  it("warns about the tools mise couldn't check, with a retry, instead of All tools up to date", async () => {
    useCachedPromiseFixtures.set(listOutdated, parseOutdated({}, uncheckedStderr));
    const { root } = await render(<Command />);
    const menu = root.findByType(MenuBarExtra);
    expect(menu.props).toMatchObject({
      title: undefined,
      tooltip: "mise: 0 outdated tools, 2 couldn't be checked",
    });
    expect(menu.findAllByType(MenuBarExtra.Item).map((n) => n.props.title)).not.toContain("All tools up to date");

    const section = menu.findAllByType(MenuBarExtra.Section).find((n) => n.props.title === "Couldn't Check");
    const items = section?.findAllByType(MenuBarExtra.Item) ?? [];
    expect(items.map((n) => [n.props.title, n.props.subtitle, n.props.icon])).toEqual([
      ["asdf:unreachable", "1.0.0", Icon.Warning],
      ["asdf:broken", "1.0.0", Icon.Warning],
    ]);
    await flush(() => items[0].props.onAction());
    expect(useCachedPromiseFixtures.revalidateOf(listOutdated)).toHaveBeenCalled();
  });

  it("keeps the outdated count in the menu bar beside unchecked tools", async () => {
    useCachedPromiseFixtures.set(listOutdated, parseOutdated(outdatedFixture, uncheckedStderr));
    const { root } = await render(<Command />);
    expect(root.findByType(MenuBarExtra).props).toMatchObject({
      title: "4",
      tooltip: "mise: 4 outdated tools, 2 couldn't be checked",
    });
  });

  it("offers the extension preferences when the configured mise path does not exist", async () => {
    mocks.getPreferenceValues.mockReturnValue({ misePath: "/nonexistent/mise" });
    const { root } = await render(<Command />);
    const item = root.findByType(MenuBarExtra.Item);
    expect(item.props.title).toBe("mise not found");
    expect(item.props.onAction).toBe(mocks.openExtensionPreferences);
  });
});

describe("Tools Menu Bar mise update", () => {
  const makeHomebrewMise = homebrewMise();
  const updateItem = (root: ReactTestInstance) =>
    root.findAllByType(MenuBarExtra.Item).find((n) => String(n.props.title).startsWith("mise "));

  it("puts a Homebrew mise update above the outdated tools, run with brew in the terminal", async () => {
    mocks.getPreferenceValues.mockReturnValue({ ...defaultPreferences, misePath: makeHomebrewMise() });
    vi.spyOn(version, "readVersion").mockResolvedValue({ version: "2026.10.15", latest: "2026.10.25" });
    useCachedPromiseFixtures.set(listOutdated, parseOutdated(outdatedFixture));
    const { root } = await render(<Command />);

    const [first, outdated] = root.findAllByType(MenuBarExtra.Section);
    expect(outdated.props.title).toBe("Outdated");
    const item = first.findByType(MenuBarExtra.Item);
    expect(item.props).toMatchObject({ title: "mise 2026.10.25 available", subtitle: "2026.10.15 → 2026.10.25" });
    await flush(() => item.props.onAction());
    expect(runAppleScript.mock.lastCall?.[0]).toContain('do script "brew upgrade mise"');

    expect(item.props.alternate.props.title).toBe("Copy Command");
    await flush(() => item.props.alternate.props.onAction());
    expect(mocks.copy).toHaveBeenCalledWith("brew upgrade mise");
  });

  it("opens the install docs when it cannot tell how mise was installed", async () => {
    vi.spyOn(version, "readVersion").mockResolvedValue({ version: "2026.10.15", latest: "2026.10.25" });
    useCachedPromiseFixtures.set(listOutdated, { tools: [], unchecked: [] });
    const { root } = await render(<Command />);

    const item = updateItem(root);
    expect(item?.props.alternate).toBeUndefined();
    await flush(() => item?.props.onAction());
    expect(mocks.open).toHaveBeenCalledWith("https://mise.jdx.dev/installing-mise.html");
    expect(runAppleScript).not.toHaveBeenCalled();
  });

  it.each([
    ["up to date", { version: "2026.10.25", latest: "2026.10.25" }],
    ["without latest", { version: "2026.10.15" }],
    ["of unknown version", undefined],
  ])("shows nothing for a mise %s", async (_, miseVersion) => {
    vi.spyOn(version, "readVersion").mockResolvedValue(miseVersion);
    useCachedPromiseFixtures.set(listOutdated, { tools: [], unchecked: [] });
    const { root } = await render(<Command />);
    expect(updateItem(root)).toBeUndefined();
    expect(root.findAllByType(MenuBarExtra.Section).map((n) => n.props.title)).toEqual(["Outdated", undefined]);
  });
});
