import { LaunchType, type LaunchProps } from "@raycast/api";
import type { ReactTestInstance } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { Action, ActionPanel, defaultPreferences, Detail, List, mocks } from "../test/raycast-api";
import { useCachedPromiseFixtures } from "../test/raycast-utils";
import { flush, render } from "../test/render";
import Command from "./installed-tools";
import { listConfigFiles, parseConfigFiles } from "./mise/config";
import * as exec from "./mise/exec";
import { listInstalled, parseInstalled } from "./mise/installed";
import { listRemote, parseRemote } from "./mise/remote";
import configFixture from "./mise/fixtures/config-ls.json";
import lsFixture from "./mise/fixtures/ls.json";
import lsRemoteFixture from "./mise/fixtures/ls-remote.json";

const launch: LaunchProps = { arguments: {}, launchType: LaunchType.UserInitiated };

function titles(node: ReactTestInstance) {
  return node.findAllByType(List.Item).map((n) => n.props.title as string);
}

describe("Installed Tools", () => {
  function setup() {
    useCachedPromiseFixtures.set(listInstalled, parseInstalled(lsFixture));
    useCachedPromiseFixtures.set(listConfigFiles, parseConfigFiles(configFixture));
    useCachedPromiseFixtures.set(listRemote, parseRemote(lsRemoteFixture));
  }

  it("splits tools into Active and Inactive by whether any version is active", async () => {
    setup();
    const { root } = await render(<Command {...launch} />);
    const [active, inactive] = root.findAllByType(List.Section);

    expect(active.props).toMatchObject({ title: "Active", subtitle: "3" });
    expect(titles(active)).toEqual(["node", "npm:wrangler", "rust"]);
    expect(active.findAllByType(List.Item)[0].props).toMatchObject({
      subtitle: "lts → 24.21.0",
      accessories: [{ text: "8 versions" }, { tag: "tools.toml" }],
    });
    expect(inactive.props).toMatchObject({ title: "Inactive", subtitle: "1" });
    expect(titles(inactive)).toEqual(["jq"]);
  });

  it("hides the Inactive section when the showInactive preference is off", async () => {
    setup();
    mocks.getPreferenceValues.mockReturnValue({ ...defaultPreferences, showInactive: false });
    const { root } = await render(<Command {...launch} />);
    expect(root.findAllByType(List.Section).map((n) => n.props.title)).toEqual(["Active"]);
    expect(titles(root)).toEqual(["node", "npm:wrangler", "rust"]);
  });

  it("runs mise upgrade with --bump --inactive -j 4 when the preferences ask for them", async () => {
    setup();
    mocks.getPreferenceValues.mockReturnValue({
      ...defaultPreferences,
      upgradeBump: true,
      includeInactive: true,
      jobs: "4",
    });
    const runMise = vi.spyOn(exec, "runMise").mockResolvedValue({ code: 0, stdout: "", stderr: "" });
    const { root } = await render(<Command {...launch} />);
    const node = root.findAllByType(List.Item).find((n) => n.props.title === "node");
    const panel = await render(node?.props.actions);
    const action = panel.root.findAllByType(Action).find((n) => n.props.title === "Upgrade");
    await flush(() => action?.props.onAction());
    expect(runMise).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/bin/sh" }),
      ["upgrade", "--bump", "--inactive", "-j", "4", "node"],
      expect.anything(),
    );
  });

  it("uninstalls a configured version through unuse on its config file when the preference is on", async () => {
    setup();
    mocks.getPreferenceValues.mockReturnValue({ ...defaultPreferences, uninstallRemovesConfig: true });
    mocks.confirmAlert.mockResolvedValue(true);
    const runMise = vi.spyOn(exec, "runMise").mockResolvedValue({ code: 0, stdout: "", stderr: "" });
    const { root } = await render(<Command {...launch} />);
    const node = root.findAllByType(List.Item).find((n) => n.props.title === "node");
    const panel = await render(node?.props.actions);
    const submenu = panel.root.findAllByType(ActionPanel.Submenu).find((n) => n.props.title === "Uninstall Version…");
    const versions = submenu?.findAllByType(Action) ?? [];
    expect(versions.map((n) => n.props.title)).toContain("24.21.0");

    await flush(() => versions.find((n) => n.props.title === "24.21.0")?.props.onAction());
    expect(mocks.confirmAlert).toHaveBeenLastCalledWith(
      expect.objectContaining({ title: "Uninstall node@24.21.0?", message: "Also removes node from tools.toml" }),
    );
    expect(runMise).toHaveBeenLastCalledWith(
      expect.objectContaining({ path: "/bin/sh" }),
      ["unuse", "--path", "/Users/lachlan/.config/mise/conf.d/tools.toml", "node@lts"],
      expect.anything(),
    );

    await flush(() => versions.find((n) => n.props.title === "22.21.0")?.props.onAction());
    expect(runMise).toHaveBeenLastCalledWith(
      expect.objectContaining({ path: "/bin/sh" }),
      ["uninstall", "node@22.21.0"],
      expect.anything(),
    );
  });

  it("pushes a version picker listing remote versions newest first with installed ones marked", async () => {
    setup();
    const { root } = await render(<Command {...launch} />);
    const jq = root.findAllByType(List.Item).find((n) => n.props.title === "jq");
    const panel = await render(jq?.props.actions);
    const push = panel.root.findAllByType(Action.Push).find((n) => n.props.title === "Set Global Version…");

    const picker = await render(push?.props.target);
    expect(picker.root.findByType(List).props.navigationTitle).toBe("Set Global Version — jq");
    const items = picker.root.findAllByType(List.Item);
    expect(items.map((n) => n.props.title)).toEqual([
      "1.8.2",
      "1.8.1",
      "1.8.0",
      "1.7.1",
      "1.7",
      "1.6",
      "1.5",
      "1.4",
      "1.3",
    ]);
    expect(items.map((n) => n.props.icon)).toEqual([
      "CheckCircle",
      "CheckCircle",
      "Circle",
      "Circle",
      "Circle",
      "Circle",
      "Circle",
      "Circle",
      "Circle",
    ]);
    expect(items[0].props.accessories).toEqual([{ text: "2026-06-20" }]);
  });

  it("shows the error with a Retry that refetches when mise ls fails", async () => {
    setup();
    useCachedPromiseFixtures.fail(listInstalled, new Error("boom"));
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
    expect(useCachedPromiseFixtures.revalidateOf(listInstalled)).toHaveBeenCalledTimes(1);
  });

  it("shows the error in the version picker with a Retry that refetches when ls-remote fails", async () => {
    setup();
    useCachedPromiseFixtures.fail(listRemote, new Error("boom"));
    const { root } = await render(<Command {...launch} />);
    const jq = root.findAllByType(List.Item).find((n) => n.props.title === "jq");
    const panel = await render(jq?.props.actions);
    const push = panel.root.findAllByType(Action.Push).find((n) => n.props.title === "Set Global Version…");

    const picker = await render(push?.props.target);
    const empty = picker.root.findByType(List.EmptyView);
    expect(empty.props).toMatchObject({ title: "Couldn't load from mise", description: "boom" });
    expect(picker.root.findAllByType(List.Item)).toEqual([]);

    const actions = await render(empty.props.actions);
    await flush(() =>
      actions.root
        .findAllByType(Action)
        .find((n) => n.props.title === "Retry")
        ?.props.onAction(),
    );
    expect(useCachedPromiseFixtures.revalidateOf(listRemote)).toHaveBeenCalledTimes(1);
  });

  it("renders MissingMise when the configured mise path does not exist", async () => {
    mocks.getPreferenceValues.mockReturnValue({ misePath: "/nonexistent/mise" });
    const { root } = await render(<Command {...launch} />);
    expect(root.findByType(Detail).props.markdown).toContain("curl https://mise.run");
  });
});
