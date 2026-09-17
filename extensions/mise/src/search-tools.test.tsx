import { LaunchType, type LaunchProps } from "@raycast/api";
import type { ReactTestInstance } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { Action, defaultPreferences, Detail, List, mocks } from "../test/raycast-api";
import { runAppleScript, useCachedPromiseFixtures } from "../test/raycast-utils";
import { flush, render } from "../test/render";
import * as exec from "./mise/exec";
import { listConfigFiles, parseConfigFiles } from "./mise/config";
import { listInstalled, parseInstalled } from "./mise/installed";
import { listRegistry, parseRegistry } from "./mise/registry";
import configFixture from "./mise/fixtures/config-ls.json";
import lsFixture from "./mise/fixtures/ls.json";
import npmFixture from "./mise/fixtures/npm-search.json";
import registryFixture from "./mise/fixtures/registry.json";
import Command from "./search-tools";

const launch: LaunchProps = { arguments: {}, launchType: LaunchType.UserInitiated };
const TOOLS_TOML = "/Users/lachlan/.config/mise/conf.d/tools.toml";

function sections(root: ReactTestInstance) {
  return root.findAllByType(List.Section).map((section) => ({
    title: section.props.title as string,
    items: section.findAllByType(List.Item),
  }));
}

async function act(root: ReactTestInstance, tool: string, title: string) {
  const item = root.findAllByType(List.Item).find((n) => n.props.title === tool);
  const panel = await render(item?.props.actions);
  const action = panel.root.findAllByType(Action).find((n) => n.props.title === title);
  await flush(() => action?.props.onAction());
}

const useGlobally = (root: ReactTestInstance, tool: string) => act(root, tool, "Use Globally");

async function actionTitles(root: ReactTestInstance, tool: string) {
  const item = root.findAllByType(List.Item).find((n) => n.props.title === tool);
  const panel = await render(item?.props.actions);
  return panel.root.findAllByType(Action).map((n) => n.props.title as string);
}

describe("Search Tools", () => {
  function setup() {
    useCachedPromiseFixtures.set(listRegistry, parseRegistry(registryFixture));
    useCachedPromiseFixtures.set(listInstalled, parseInstalled(lsFixture));
    useCachedPromiseFixtures.set(listConfigFiles, parseConfigFiles(configFixture));
  }

  it("puts backend results for a deeplinked npm:prettier query before the installed tools", async () => {
    setup();
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(npmFixture)));
    const { root } = await render(<Command {...launch} fallbackText="npm:prettier" />);

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("registry.npmjs.org"), expect.anything());
    const [backend, installed] = sections(root);
    expect(backend.title).toBe("npm results");
    expect(backend.items[0].props.title).toBe("npm:prettier");
    expect(backend.items[0].props.accessories).toEqual([{ tag: "npm" }, { text: "3.9.7" }]);
    expect(installed.title).toBe("Installed");
    expect(root.findByType(List).props.searchText).toBe("npm:prettier");
  });

  it("runs mise use -g, or --path with the dropdown's file, from Use Globally", async () => {
    setup();
    const runMise = vi.spyOn(exec, "runMise").mockResolvedValue({ code: 0, stdout: "", stderr: "" });
    const { root } = await render(<Command {...launch} />);

    await useGlobally(root, "jq");
    expect(runMise).toHaveBeenLastCalledWith(
      expect.objectContaining({ path: "/bin/sh" }),
      ["use", "-g", "jq@latest"],
      expect.anything(),
    );

    const dropdown = (await render(root.findByType(List).props.searchBarAccessory)).root.findByType(List.Dropdown);
    expect(dropdown.findAllByType(List.Dropdown.Item).map((n) => n.props.value)).toContain(TOOLS_TOML);
    await flush(() => dropdown.props.onChange(TOOLS_TOML));
    await useGlobally(root, "jq");
    expect(runMise).toHaveBeenLastCalledWith(
      expect.objectContaining({ path: "/bin/sh" }),
      ["use", "--path", TOOLS_TOML, "jq@latest"],
      expect.anything(),
    );
    expect(mocks.showToast).toHaveBeenLastCalledWith(
      expect.objectContaining({ title: "jq added → conf.d/tools.toml" }),
    );
  });

  it("leads an installed row with Remove, which runs unuse then uninstall --all once confirmed", async () => {
    setup();
    const runMise = vi.spyOn(exec, "runMise").mockResolvedValue({ code: 0, stdout: "", stderr: "" });
    const { root } = await render(<Command {...launch} />);
    expect((await actionTitles(root, "jq"))[0]).toBe("Remove jq…");
    expect(await actionTitles(root, "jq")).toContain("Use Globally");
    expect((await actionTitles(root, "ripgrep"))[0]).toBe("Use Globally");

    mocks.confirmAlert.mockResolvedValue(false);
    await act(root, "jq", "Remove jq…");
    expect(mocks.confirmAlert).toHaveBeenLastCalledWith(
      expect.objectContaining({
        title: "Remove jq?",
        message: "Removes jq from your mise config and deletes 2 installed versions.",
        primaryAction: expect.objectContaining({ title: "Remove", style: "destructive" }),
      }),
    );
    expect(runMise).not.toHaveBeenCalled();

    mocks.confirmAlert.mockResolvedValue(true);
    await act(root, "jq", "Remove jq…");
    expect(runMise.mock.calls.map((call) => call[1])).toEqual([
      ["unuse", "jq"],
      ["uninstall", "--all", "jq"],
    ]);
    expect(mocks.showToast).toHaveBeenLastCalledWith(expect.objectContaining({ title: "jq removed" }));
    expect(useCachedPromiseFixtures.revalidateOf(listInstalled)).toHaveBeenCalledTimes(1);
  });

  it("hands mise use -g to the chosen terminal from Run in Terminal and closes the window", async () => {
    setup();
    mocks.getPreferenceValues.mockReturnValue({
      ...defaultPreferences,
      terminalApp: { name: "Ghostty", path: "/Applications/Ghostty.app", bundleId: "com.mitchellh.ghostty" },
    });
    const { root } = await render(<Command {...launch} />);
    await act(root, "jq", "Run in Terminal");
    expect(runAppleScript).toHaveBeenCalledTimes(1);
    const [source] = runAppleScript.mock.calls[0];
    expect(source).toContain('tell application "Ghostty"');
    expect(source).toContain("/bin/sh use -g jq@latest");
    expect(mocks.closeMainWindow).toHaveBeenCalled();
  });

  it("debounces the backend request so a query typed within 250ms fetches once, for the final text", async () => {
    setup();
    vi.useFakeTimers();
    try {
      const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(npmFixture)));
      const { root } = await render(<Command {...launch} />);
      const list = root.findByType(List);
      await flush(() => list.props.onSearchTextChange("npm:pre"));
      await flush(() => vi.advanceTimersByTime(100));
      await flush(() => list.props.onSearchTextChange("npm:prettier"));
      await flush(() => vi.advanceTimersByTime(249));
      expect(fetch).not.toHaveBeenCalled();
      await flush(() => vi.advanceTimersByTime(1));
      await flush();
      expect(fetch).toHaveBeenCalledOnce();
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining("text=prettier"), expect.anything());
      expect(sections(root)[0].items[0].props.title).toBe("npm:prettier");
    } finally {
      vi.useRealTimers();
    }
  });

  it("filters the registry itself, ranking the typed name first and hiding tools that do not match", async () => {
    setup();
    const { root } = await render(<Command {...launch} />);
    const list = root.findByType(List);
    expect(list.props.filtering).toBe(false);

    await flush(() => list.props.onSearchTextChange("rg"));
    const [installed, registry] = sections(root);
    expect(installed.items).toEqual([]);
    expect(registry.items.map((n) => n.props.title)).toEqual(["ripgrep"]);

    await flush(() => list.props.onSearchTextChange("nod"));
    expect(sections(root).map((s) => s.items.map((n) => n.props.title))).toEqual([["node"], []]);
  });

  it("shows the first 100 registry tools with an empty query and says how many there are", async () => {
    const extra = Array.from({ length: 120 }, (_, i) => ({
      short: `tool-${String(i).padStart(3, "0")}`,
      backends: ["aqua:x/y"],
    }));
    useCachedPromiseFixtures.set(listRegistry, parseRegistry([...registryFixture, ...extra]));
    useCachedPromiseFixtures.set(listInstalled, parseInstalled(lsFixture));
    useCachedPromiseFixtures.set(listConfigFiles, parseConfigFiles(configFixture));
    const { root } = await render(<Command {...launch} />);
    const [installed, registry] = sections(root);

    expect(installed.items.map((n) => n.props.title)).toEqual(["jq", "node"]);
    expect(registry.items).toHaveLength(100);
    expect(registry.items[99].props.title).toBe("tool-096");
    expect(root.findAllByType(List.Section)[1].props.subtitle).toBe("100 of 123");

    await flush(() => root.findByType(List).props.onSearchTextChange("tool-119"));
    expect(sections(root)[1].items.map((n) => n.props.title)).toEqual(["tool-119"]);
  });

  it("lists installed registry tools under Installed with their versions, leaving backend specs untagged", async () => {
    setup();
    const { root } = await render(<Command {...launch} />);
    const [installed, registry] = sections(root);

    expect(installed.title).toBe("Installed");
    expect(installed.items.map((n) => n.props.title)).toEqual(["jq", "node"]);
    expect(installed.items[0].props.accessories).toEqual([
      { tag: "aqua" },
      { text: "1.8.1, 1.8.2", icon: "CheckCircle" },
    ]);
    expect(registry.title).toBe("Registry");
    expect(root.findAllByType(List.Section)[1].props.subtitle).toBe("3");
    expect(registry.items.map((n) => n.props.title)).toEqual(["1password", "ripgrep", "ag"]);
    expect(root.findAllByType(List.Item).filter((n) => /wrangler/.test(n.props.title))).toEqual([]);
  });

  it("opens with the details panel showing when the showDetails preference is on", async () => {
    setup();
    const showingDetail = async () =>
      (await render(<Command {...launch} />)).root.findByType(List).props.isShowingDetail;
    mocks.getPreferenceValues.mockReturnValue({ ...defaultPreferences, showDetails: false });
    expect(await showingDetail()).toBe(false);
    mocks.getPreferenceValues.mockReturnValue({ ...defaultPreferences, showDetails: true });
    expect(await showingDetail()).toBe(true);
  });

  it("shows the last line of mise's stderr with a Retry that refetches when the registry fails", async () => {
    setup();
    const error = new exec.MiseExitError(
      ["registry"],
      2,
      "error: unexpected argument '--bogus'\n\nUsage: mise registry\n\n",
    );
    useCachedPromiseFixtures.fail(listRegistry, error);
    const { root } = await render(<Command {...launch} />);

    const empty = root.findByType(List.EmptyView);
    expect(empty.props).toMatchObject({ title: "Couldn't load from mise", description: "Usage: mise registry" });
    expect(root.findAllByType(List.Item)).toEqual([]);

    const panel = await render(empty.props.actions);
    expect(panel.root.findByType(Action.CopyToClipboard).props.content).toBe(error.message);
    await flush(() =>
      panel.root
        .findAllByType(Action)
        .find((n) => n.props.title === "Retry")
        ?.props.onAction(),
    );
    expect(useCachedPromiseFixtures.revalidateOf(listRegistry)).toHaveBeenCalledTimes(1);
  });

  it("renders MissingMise when the configured mise path does not exist", async () => {
    mocks.getPreferenceValues.mockReturnValue({ misePath: "/nonexistent/mise" });
    const { root } = await render(<Command {...launch} />);
    const detail = root.findByType(Detail);
    expect(detail.props.markdown).toContain("curl https://mise.run");
    expect(detail.props.markdown).toContain("/nonexistent/mise");
  });
});
