import type { ReactTestInstance } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { Action, Detail, Form, List, mocks } from "../test/raycast-api";
import { runAppleScript, showFailureToast, useCachedPromiseFixtures } from "../test/raycast-utils";
import { flush, render } from "../test/render";
import * as exec from "./mise/exec";
import addFixture from "./mise/fixtures/tasks-add.json";
import replacedFixture from "./mise/fixtures/tasks-add-dry-run-replaced.json";
import editingFixture from "./mise/fixtures/tasks-ls-2026.11.0.json";
import tasksFixture from "./mise/fixtures/tasks-ls.json";
import { listTasks, parseTasks } from "./mise/tasks";
import * as version from "./mise/version";
import Command from "./tasks";

const EDITING = ["Create Task", "Edit Task", "Delete Task"];

function titles(panel: ReactTestInstance): string[] {
  return panel.findAll((n) => n.type === Action || n.type === Action.Push).map((n) => n.props.title);
}

async function withMise(miseVersion: string | undefined, tasks = parseTasks(editingFixture)) {
  vi.spyOn(version, "readVersion").mockResolvedValue(miseVersion ? { version: miseVersion } : undefined);
  useCachedPromiseFixtures.set(listTasks, tasks);
  return (await render(<Command />)).root;
}

async function pushed(panel: ReactTestInstance, title: string) {
  const push = panel.findAllByType(Action.Push).find((n) => n.props.title === title);
  return (await render(push?.props.target)).root;
}

async function submit(form: ReactTestInstance, values: Record<string, string>) {
  const panel = (await render(form.findByType(Form).props.actions)).root;
  await flush(() => panel.findByType(Action.SubmitForm).props.onSubmit(values));
}

function field(form: ReactTestInstance, id: string) {
  return form.findAllByType(Form.TextField).find((n) => n.props.id === id);
}

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

describe("Manage Tasks editing", () => {
  it.each([
    ["2026.10.25", true],
    ["2026.11.0", true],
    ["2026.10.24", false],
    [undefined, false],
  ])("with mise %s, Create, Edit and Delete Task shown: %s", async (miseVersion, shown) => {
    const root = await withMise(miseVersion);
    const panel = await actions(root, "greet");
    expect(titles(panel).filter((t) => EDITING.includes(t))).toEqual(shown ? EDITING : []);

    const empty = await withMise(miseVersion, []);
    const emptyView = empty.findByType(List.EmptyView);
    expect(emptyView.props.actions ? titles((await render(emptyView.props.actions)).root) : []).toEqual(
      shown ? ["Create Task"] : [],
    );
  });

  it("offers only Create Task on a file task, which mise tasks set refuses", async () => {
    const panel = await actions(await withMise("2026.11.0"), "backup");
    expect(titles(panel).filter((t) => EDITING.includes(t))).toEqual(["Create Task"]);
  });

  it("deletes the task from its file only after the confirmation, then refreshes", async () => {
    const runMise = vi.spyOn(exec, "runMise").mockResolvedValue({ code: 0, stdout: "", stderr: "" });
    const panel = await actions(await withMise("2026.11.0"), "dotfiles:apply");
    const del = panel.findAllByType(Action).find((n) => n.props.title === "Delete Task");

    mocks.confirmAlert.mockResolvedValue(false);
    await flush(() => del?.props.onAction());
    expect(mocks.confirmAlert).toHaveBeenLastCalledWith(
      expect.objectContaining({
        title: "Delete dotfiles:apply?",
        message: "Removes it from tasks.toml",
        primaryAction: expect.objectContaining({ title: "Delete", style: "destructive" }),
      }),
    );
    expect(runMise).not.toHaveBeenCalled();

    mocks.confirmAlert.mockResolvedValue(true);
    await flush(() => del?.props.onAction());
    expect(runMise).toHaveBeenCalledWith(
      expect.anything(),
      ["tasks", "rm", "--yes", "--path", "/tmp/mise-iso5e/config/conf.d/tasks.toml", "dotfiles:apply"],
      expect.anything(),
    );
    expect(mocks.showToast).toHaveBeenLastCalledWith(expect.objectContaining({ title: "dotfiles:apply deleted" }));
    expect(useCachedPromiseFixtures.revalidateOf(listTasks)).toHaveBeenCalledTimes(1);
  });

  it("creates a task after checking the name, then refreshes and closes the form", async () => {
    const miseJson = vi.spyOn(exec, "miseJson").mockImplementation(async (_l, _a, parse) => parse(addFixture, ""));
    const runMise = vi.spyOn(exec, "runMise").mockResolvedValue({ code: 0, stdout: "", stderr: "" });
    const form = await pushed(await actions(await withMise("2026.11.0"), "greet"), "Create Task");

    await submit(form, { name: "notes:sync", description: " Sync notes ", run: "rsync -a ~/notes 'My Backup'" });
    expect(field(form, "run")?.props.error).toMatch(/sh -c/);
    expect(runMise).not.toHaveBeenCalled();

    await submit(form, { name: "notes:sync", description: " Sync notes ", run: "rsync -a notes 'My Backup'" });
    expect(miseJson).toHaveBeenCalledWith(
      expect.anything(),
      ["tasks", "add", "--global", "--dry-run", "notes:sync"],
      expect.any(Function),
    );
    expect(runMise).toHaveBeenCalledWith(
      expect.anything(),
      ["tasks", "add", "--global", "--description=Sync notes", "notes:sync", "--", "rsync", "-a", "notes", "My Backup"],
      expect.anything(),
    );
    expect(mocks.showToast).toHaveBeenLastCalledWith(expect.objectContaining({ title: "notes:sync created" }));
    expect(useCachedPromiseFixtures.revalidateOf(listTasks)).toHaveBeenCalledTimes(1);
    expect(mocks.pop).toHaveBeenCalledTimes(1);
  });

  it("refuses a name that is taken, invalid, or would replace a hidden task in the global config", async () => {
    const miseJson = vi.spyOn(exec, "miseJson").mockImplementation(async (_l, _a, parse) => parse(replacedFixture, ""));
    const runMise = vi.spyOn(exec, "runMise");
    const form = await pushed(await actions(await withMise("2026.11.0"), "greet"), "Create Task");

    await submit(form, { name: "dotfiles:apply", description: "", run: "true" });
    expect(field(form, "name")?.props.error).toBe("A task with this name already exists");
    await submit(form, { name: "x*", description: "", run: "true" });
    expect(field(form, "name")?.props.error).toMatch(/pattern/);
    expect(miseJson).not.toHaveBeenCalled();

    await submit(form, { name: "secret", description: "", run: "true" });
    expect(field(form, "name")?.props.error).toBe("config.toml already has a task with this name");
    expect(runMise).not.toHaveBeenCalled();
  });

  it("reports a failed name check instead of creating the task", async () => {
    vi.spyOn(exec, "miseJson").mockRejectedValue(new Error("boom"));
    const runMise = vi.spyOn(exec, "runMise");
    const form = await pushed(await actions(await withMise("2026.11.0"), "greet"), "Create Task");
    await submit(form, { name: "notes", description: "", run: "true" });
    expect(showFailureToast).toHaveBeenCalledWith(expect.any(Error), { title: "Creating notes failed" });
    expect(runMise).not.toHaveBeenCalled();
  });

  it("prefills Edit Task and sends only what changed to the task's own file", async () => {
    const runMise = vi.spyOn(exec, "runMise").mockResolvedValue({ code: 0, stdout: "", stderr: "" });
    const form = await pushed(await actions(await withMise("2026.11.0"), "greet"), "Edit Task");
    expect(field(form, "name")).toBeUndefined();
    expect(field(form, "description")?.props.value).toBe("Say hello loudly");
    expect(field(form, "run")?.props.value).toBe("echo 'HELLO there'");

    await submit(form, { description: "Say hello loudly", run: "echo 'HELLO there'" });
    expect(runMise).not.toHaveBeenCalled();
    expect(mocks.pop).toHaveBeenCalledTimes(1);

    await submit(form, { description: "", run: "echo 'HELLO there'" });
    expect(runMise).toHaveBeenLastCalledWith(
      expect.anything(),
      ["tasks", "set", "--path", "/tmp/mise-iso5e/config/config.toml", "--unset", "description", "greet"],
      expect.anything(),
    );
    expect(mocks.showToast).toHaveBeenLastCalledWith(expect.objectContaining({ title: "greet saved" }));
    expect(useCachedPromiseFixtures.revalidateOf(listTasks)).toHaveBeenCalledTimes(1);

    await submit(form, { description: "Say hello loudly", run: "echo hi" });
    expect(runMise.mock.lastCall?.[1]).toEqual([
      "tasks",
      "set",
      "--path",
      "/tmp/mise-iso5e/config/config.toml",
      "greet",
      "--",
      "echo",
      "hi",
    ]);
  });

  it("keeps a task's several run commands, which the one-line field cannot hold", async () => {
    const runMise = vi.spyOn(exec, "runMise").mockResolvedValue({ code: 0, stdout: "", stderr: "" });
    const form = await pushed(await actions(await withMise("2026.11.0"), "dotfiles:apply"), "Edit Task");
    expect(field(form, "run")).toBeUndefined();
    expect(form.findAllByType(Form.Description).map((n) => n.props.text)).toContain(
      "2 commands; edit them in tasks.toml",
    );
    await submit(form, { description: "Apply dotfiles" });
    expect(runMise.mock.lastCall?.[1]).toEqual([
      "tasks",
      "set",
      "--path",
      "/tmp/mise-iso5e/config/conf.d/tasks.toml",
      "--description=Apply dotfiles",
      "dotfiles:apply",
    ]);
  });
});
