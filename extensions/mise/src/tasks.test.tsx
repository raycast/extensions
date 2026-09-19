import type { ReactTestInstance } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { Action, Detail, List, mocks } from "../test/raycast-api";
import { runAppleScript, useCachedPromiseFixtures } from "../test/raycast-utils";
import { flush, render } from "../test/render";
import * as exec from "./mise/exec";
import tasksFixture from "./mise/fixtures/tasks-ls.json";
import { listTasks, parseTasks } from "./mise/tasks";
import Command from "./tasks";

async function actions(root: ReactTestInstance, task: string) {
  const item = root.findAllByType(List.Item).find((n) => n.props.title === task);
  return (await render(item?.props.actions)).root;
}

describe("Manage Tasks", () => {
  it("groups tasks by their namespace with description, aliases and the config file", async () => {
    const [apply, status, check] = parseTasks(tasksFixture);
    useCachedPromiseFixtures.set(listTasks, [apply, status, { ...check, name: "lint", aliases: ["l"] }]);
    const { root } = await render(<Command />);
    const sections = root.findAllByType(List.Section);

    expect(sections.map((s) => [s.props.title, s.props.subtitle])).toEqual([
      ["dotfiles", "2"],
      ["Tasks", "1"],
    ]);
    expect(sections[0].findAllByType(List.Item).map((n) => n.props.title)).toEqual([
      "dotfiles:apply",
      "dotfiles:status",
    ]);
    expect(sections[1].findAllByType(List.Item)[0].props).toMatchObject({
      title: "lint",
      subtitle: "Verify that the Neovim configuration starts cleanly",
      keywords: ["l"],
      accessories: [{ tag: "tasks.toml" }],
    });
  });

  it("offers Run in Terminal first, then the capture, the task file and the copyable command", async () => {
    useCachedPromiseFixtures.set(listTasks, parseTasks(tasksFixture));
    const { root } = await render(<Command />);
    const panel = await actions(root, "nvim:check");

    expect(panel.findAllByType(Action).map((n) => n.props.title)).toEqual(["Run in Terminal", "Run and Show Output"]);
    expect(panel.findByType(Action.Open).props.target).toBe("/Users/lachlan/.config/mise/conf.d/tasks.toml");
    expect(panel.findByType(Action.CopyToClipboard).props.content).toBe("mise run nvim:check");

    await flush(() => panel.findAllByType(Action)[0].props.onAction());
    expect(runAppleScript).toHaveBeenCalledWith(expect.stringContaining("/bin/sh run nvim:check"));
  });

  it("runs the task behind a toast and pushes its captured output from Run and Show Output", async () => {
    useCachedPromiseFixtures.set(listTasks, parseTasks(tasksFixture));
    const runMise = vi
      .spyOn(exec, "runMise")
      .mockResolvedValue({ code: 0, stdout: "Neovim OK\n", stderr: "[nvim:check] $ nvim --headless\n" });
    const { root } = await render(<Command />);
    const panel = await actions(root, "nvim:check");

    await flush(() => panel.findAllByType(Action)[1].props.onAction());
    expect(runMise).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/bin/sh" }),
      ["run", "nvim:check"],
      expect.anything(),
    );
    expect(mocks.showToast).toHaveBeenLastCalledWith(expect.objectContaining({ title: "nvim:check finished" }));
    const detail = (await render(mocks.push.mock.calls[0][0])).root.findByType(Detail);
    expect(detail.props.navigationTitle).toBe("nvim:check");
    expect(detail.props.markdown).toBe("```\nNeovim OK\n[nvim:check] $ nvim --headless\n\n```");
  });

  it("shows the empty view when there are no global tasks", async () => {
    useCachedPromiseFixtures.set(listTasks, []);
    const { root } = await render(<Command />);
    expect(root.findAllByType(List.Item)).toEqual([]);
    expect(root.findByType(List.EmptyView).props.title).toBe("No global tasks");
  });

  it("shows the error with a Retry that refetches when mise tasks ls fails", async () => {
    useCachedPromiseFixtures.fail(listTasks, new Error("boom"));
    const { root } = await render(<Command />);

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
    expect(useCachedPromiseFixtures.revalidateOf(listTasks)).toHaveBeenCalledTimes(1);
  });

  it("renders MissingMise when the configured mise path does not exist", async () => {
    mocks.getPreferenceValues.mockReturnValue({ misePath: "/nonexistent/mise" });
    const { root } = await render(<Command />);
    expect(root.findByType(Detail).props.markdown).toContain("curl https://mise.run");
  });
});
