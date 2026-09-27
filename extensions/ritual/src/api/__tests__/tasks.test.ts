import { describe, expect, it, vi } from "vitest";
import { makeCli } from "../cli";
import {
  addArgs,
  addTask,
  completeTask,
  listArgs,
  listTasks,
  updateArgs,
} from "../tasks";

describe("listArgs", () => {
  it("maps every scope to its flag", () => {
    expect(listArgs("today")).toEqual(["list", "--today"]);
    expect(listArgs("upcoming")).toEqual(["list", "--upcoming"]);
    expect(listArgs("inbox")).toEqual(["list", "--inbox"]);
    expect(listArgs("all")).toEqual(["list", "--all"]);
  });
});

describe("addArgs", () => {
  it("puts the title after a terminator so a leading dash is not a flag", () => {
    expect(addArgs({ title: "-n is not a flag", when: "inbox" })).toEqual([
      "add",
      "--",
      "-n is not a flag",
    ]);
  });

  it("schedules for today, and evening implies today", () => {
    expect(addArgs({ title: "x", when: "today" })).toEqual([
      "add",
      "--today",
      "--",
      "x",
    ]);
    expect(addArgs({ title: "x", when: "evening" })).toEqual([
      "add",
      "--evening",
      "--",
      "x",
    ]);
  });

  it("carries notes, deadline, project and repeated tags before the terminator", () => {
    expect(
      addArgs({
        title: "x",
        when: "inbox",
        notes: "why",
        deadline: "2026-12-25",
        project: "Kitchen Reno",
        tags: ["work", "home"],
      }),
    ).toEqual([
      "add",
      "--notes",
      "why",
      "--deadline",
      "2026-12-25",
      "--project",
      "Kitchen Reno",
      "--tag",
      "work",
      "--tag",
      "home",
      "--",
      "x",
    ]);
  });
});

describe("updateArgs", () => {
  it("sends only the fields that changed", () => {
    expect(updateArgs("abc", { title: "new" })).toEqual([
      "update",
      "abc",
      "--title",
      "new",
    ]);
  });

  it("clears a deadline with the literal 'none' rather than omitting it", () => {
    expect(updateArgs("abc", { deadline: null })).toEqual([
      "update",
      "abc",
      "--deadline",
      "none",
    ]);
  });

  it("clears a project with 'none'", () => {
    expect(updateArgs("abc", { project: null })).toEqual([
      "update",
      "abc",
      "--project",
      "none",
    ]);
  });

  it("repeats --tag and --untag per name", () => {
    expect(
      updateArgs("abc", { addTags: ["a"], removeTags: ["b", "c"] }),
    ).toEqual(["update", "abc", "--tag", "a", "--untag", "b", "--untag", "c"]);
  });

  it("trims notes, matching addArgs — otherwise a trailing newline reads as an edit", () => {
    expect(updateArgs("abc", { notes: "why \n" })).toEqual([
      "update",
      "abc",
      "--notes",
      "why",
    ]);
  });
});

describe("listTasks", () => {
  it("tolerates a schema-1 row that predates tags and subtask counts", async () => {
    const stdout = JSON.stringify([
      {
        schema: 1,
        id: "1",
        title: "old",
        evening: false,
        completed: false,
        overdue: false,
      },
    ]);
    const cli = makeCli(
      "/bin/ritual",
      vi.fn().mockResolvedValue({ stdout, stderr: "" }),
    );

    const tasks = await listTasks(cli, "today");

    expect(tasks[0].tags).toBeUndefined();
    expect(tasks[0].title).toBe("old");
  });

  it("tolerates a schema-2 row that predates tag colors and subtask titles", async () => {
    // schema 2 sends `tags` and `checklistDone`/`checklistTotal`, but not the
    // schema-3 `tagColors` or `checklist` — a build running an older CLI must
    // still render fully off this shape.
    const stdout = JSON.stringify([
      {
        schema: 2,
        id: "1",
        title: "mid",
        evening: false,
        completed: false,
        overdue: false,
        tags: ["work"],
        checklistDone: 1,
        checklistTotal: 2,
      },
    ]);
    const cli = makeCli(
      "/bin/ritual",
      vi.fn().mockResolvedValue({ stdout, stderr: "" }),
    );

    const tasks = await listTasks(cli, "today");

    expect(tasks[0].tags).toEqual(["work"]);
    expect(tasks[0].tagColors).toBeUndefined();
    expect(tasks[0].checklist).toBeUndefined();
    expect(tasks[0].checklistDone).toBe(1);
    expect(tasks[0].checklistTotal).toBe(2);
  });
});

describe("completeTask", () => {
  it("passes changed:false through rather than reporting success", async () => {
    const stdout = JSON.stringify({ schema: 1, id: "1", changed: false });
    const cli = makeCli(
      "/bin/ritual",
      vi.fn().mockResolvedValue({ stdout, stderr: "" }),
    );

    await expect(completeTask(cli, "1")).resolves.toEqual({
      schema: 1,
      id: "1",
      changed: false,
    });
  });
});

describe("addTask", () => {
  it("surfaces the CLI's unsynced-changes note from stderr", async () => {
    const run = vi.fn().mockResolvedValue({
      stdout: "",
      stderr:
        "ritual: 2 changes waiting to sync — open Ritual, or pass --sync\n",
    });

    const note = await addTask(makeCli("/bin/ritual", run), {
      title: "x",
      when: "inbox",
    });

    expect(note).toBe("2 changes waiting to sync");
  });

  it("resolves to undefined when everything is synced", async () => {
    const run = vi.fn().mockResolvedValue({ stdout: "", stderr: "" });
    await expect(
      addTask(makeCli("/bin/ritual", run), { title: "x", when: "inbox" }),
    ).resolves.toBeUndefined();
  });
});
