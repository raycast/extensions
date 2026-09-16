import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rename, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, test } from "vitest";
import {
  buildUpdatedContent,
  formatDailyNoteFileName,
  formatInputLines,
  saveInput,
  type Route,
} from "../src/lib/storage";

const temporaryDirectories: string[] = [];
const execFileAsync = promisify(execFile);
const workerScript = `
  import { saveInput } from "./src/lib/storage.ts";
  await saveInput({
    vaultPath: process.env.TALK_TO_ACTION_VAULT_PATH,
    dailyNoteFolder: "",
    dailyNoteFileFormat: "YYYY-MM-DD",
    route: {
      destination: "existing-file",
      filePath: "Tasks.md",
      position: "append",
      section: "none",
      heading: "",
      lineFormat: "task",
      addCurrentTime: false,
    },
    input: process.env.TALK_TO_ACTION_INPUT,
  });
`;

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

const baseRoute: Route = {
  destination: "existing-file",
  filePath: "Tasks.md",
  position: "append",
  section: "none",
  heading: "",
  lineFormat: "task",
  addCurrentTime: false,
};

async function makeVault(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "talk-to-action-raycast-"));
  temporaryDirectories.push(directory);
  return directory;
}

async function saveFromAnotherProcess(vaultPath: string, input: string): Promise<void> {
  await execFileAsync(process.execPath, ["--import", "tsx", "--input-type=module", "--eval", workerScript], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      TALK_TO_ACTION_VAULT_PATH: vaultPath,
      TALK_TO_ACTION_INPUT: input,
    },
  });
}

describe("formatting", () => {
  test("formats bullet, task, plain, and multiline input", () => {
    expect(formatInputLines(" buy milk \n call mom ", "bullet", false)).toEqual(["- buy milk", "- call mom"]);
    expect(formatInputLines("buy milk", "task", false)).toEqual(["- [ ] buy milk"]);
    expect(formatInputLines("buy milk", "plain", false)).toEqual(["buy milk"]);
  });

  test("adds a localized short time after the line marker", () => {
    const lines = formatInputLines("buy milk", "task", true, new Date(2026, 7, 14, 9, 30));
    expect(lines[0]).toMatch(/^- \[ \] .+ buy milk$/);
  });

  test("rejects empty input", () => {
    expect(() => formatInputLines(" \n ", "plain", false)).toThrow("Input is empty");
  });

  test("creates a date-based Markdown file name", () => {
    expect(formatDailyNoteFileName("YYYY-MM-DD", new Date(2026, 7, 14))).toBe("2026-08-14.md");
    expect(formatDailyNoteFileName("YYYY-MM-DD.md", new Date(2026, 7, 14))).toBe("2026-08-14.md");
  });
});

describe("content insertion", () => {
  test("appends and prepends while leaving one final newline", () => {
    expect(buildUpdatedContent("old\n", ["- new"], { ...baseRoute, position: "append" })).toBe("old\n- new\n");
    expect(buildUpdatedContent("old\n", ["- new"], { ...baseRoute, position: "prepend" })).toBe("- new\nold\n");
    expect(buildUpdatedContent("old\r\n", ["- new"], { ...baseRoute, position: "append" })).toBe("old\r\n- new\r\n");
  });

  test("inserts after the first matching heading", () => {
    const route = { ...baseRoute, section: "after-heading" as const, heading: "Inbox" };
    expect(buildUpdatedContent("# Today\n\n## Inbox\nold\n## Later\n", ["- new"], route)).toBe(
      "# Today\n\n## Inbox\n- new\nold\n## Later\n",
    );
  });

  test("inserts at the end of the section before the next same-level heading", () => {
    const route = { ...baseRoute, section: "section-end" as const, heading: "Inbox" };
    expect(buildUpdatedContent("## Inbox\none\n### Child\ntwo\n\n## Later\n", ["- new"], route)).toBe(
      "## Inbox\none\n### Child\ntwo\n- new\n\n## Later\n",
    );
  });

  test("rejects a missing heading", () => {
    const route = { ...baseRoute, section: "section-end" as const, heading: "Missing" };
    expect(() => buildUpdatedContent("## Inbox\none\n", ["- new"], route)).toThrow('Heading "Missing" was not found');
  });
});

describe("Vault writes", () => {
  test("appends to an existing Daily Note without a plugin", async () => {
    const vault = await makeVault();
    await mkdir(path.join(vault, "Daily Note"));
    await writeFile(path.join(vault, "Daily Note/2026-08-14.md"), "");
    const result = await saveInput({
      vaultPath: vault,
      dailyNoteFolder: "Daily Note",
      dailyNoteFileFormat: "YYYY-MM-DD",
      route: {
        ...baseRoute,
        destination: "daily-note",
        filePath: "",
        position: "append",
      },
      input: "Call the bank",
      now: new Date(2026, 7, 14),
    });

    expect(result.relativePath).toBe("Daily Note/2026-08-14.md");
    expect(await readFile(path.join(vault, result.relativePath), "utf8")).toBe("- [ ] Call the bank\n");
  });

  test("prepends Shopping to an existing Markdown file", async () => {
    const vault = await makeVault();
    await writeFile(path.join(vault, "Shopping.md"), "- [ ] Existing\n");

    await saveInput({
      vaultPath: vault,
      dailyNoteFolder: "Daily Note",
      dailyNoteFileFormat: "YYYY-MM-DD",
      route: {
        ...baseRoute,
        destination: "existing-file",
        filePath: "Shopping.md",
        position: "prepend",
      },
      input: "Milk",
    });

    expect(await readFile(path.join(vault, "Shopping.md"), "utf8")).toBe("- [ ] Milk\n- [ ] Existing\n");
  });

  test("keeps both entries when two saves target the same file concurrently", async () => {
    const vault = await makeVault();
    const filePath = path.join(vault, "Tasks.md");
    await writeFile(filePath, "# Tasks\n");

    await Promise.all([
      saveInput({
        vaultPath: vault,
        dailyNoteFolder: "",
        dailyNoteFileFormat: "YYYY-MM-DD",
        route: baseRoute,
        input: "First concurrent task",
      }),
      saveInput({
        vaultPath: vault,
        dailyNoteFolder: "",
        dailyNoteFileFormat: "YYYY-MM-DD",
        route: baseRoute,
        input: "Second concurrent task",
      }),
    ]);

    expect(await readFile(filePath, "utf8")).toBe(
      "# Tasks\n- [ ] First concurrent task\n- [ ] Second concurrent task\n",
    );
  });

  test("keeps every entry when separate Raycast processes save concurrently", async () => {
    const vault = await makeVault();
    const filePath = path.join(vault, "Tasks.md");
    const inputs = Array.from({ length: 8 }, (_, index) => "Cross-process task " + (index + 1));
    await writeFile(filePath, "# Tasks\n");

    await Promise.all(inputs.map((input) => saveFromAnotherProcess(vault, input)));

    const content = await readFile(filePath, "utf8");
    for (const input of inputs) {
      expect(content).toContain("- [ ] " + input);
    }
  });

  test("does not modify a target that is moved outside the Vault during a save", async () => {
    const vault = await makeVault();
    const outside = await mkdtemp(path.join(os.tmpdir(), "talk-to-action-raycast-outside-"));
    temporaryDirectories.push(outside);
    const filePath = path.join(vault, "Tasks.md");
    const movedPath = path.join(outside, "Tasks.md");
    await writeFile(filePath, "# Tasks\n");

    const moveTarget = (async () => {
      for (let attempt = 0; attempt < 200; attempt += 1) {
        const entries = await readdir(vault);
        if (entries.some((entry) => entry.startsWith(".talk-to-action-for-raycast-"))) {
          await rename(filePath, movedPath);
          return true;
        }
        await new Promise((resolve) => setTimeout(resolve, 5));
      }
      return false;
    })();

    await expect(
      saveInput({
        vaultPath: vault,
        dailyNoteFolder: "",
        dailyNoteFileFormat: "YYYY-MM-DD",
        route: baseRoute,
        input: "Keep this inside the Vault ".repeat(500_000),
      }),
    ).rejects.toThrow("Tasks.md");

    expect(await moveTarget).toBe(true);
    expect(await readFile(movedPath, "utf8")).toBe("# Tasks\n");
    await expect(readFile(filePath, "utf8")).rejects.toThrow("ENOENT");
  });

  test("reclaims a lock only after its owner process has exited", async () => {
    const vault = await makeVault();
    const filePath = path.join(vault, "Tasks.md");
    const lockDirectory = path.join(os.tmpdir(), "talk-to-action-for-raycast-locks");
    const lockName = createHash("sha256").update(vault).update("\0").update("Tasks.md").digest("hex") + ".lock";
    await writeFile(filePath, "# Tasks\n");
    await mkdir(lockDirectory, { recursive: true });
    await writeFile(path.join(lockDirectory, lockName), JSON.stringify({ pid: 999_999_999, token: "abandoned" }));

    await saveInput({
      vaultPath: vault,
      dailyNoteFolder: "",
      dailyNoteFileFormat: "YYYY-MM-DD",
      route: baseRoute,
      input: "Recovered task",
    });

    expect(await readFile(filePath, "utf8")).toBe("# Tasks\n- [ ] Recovered task\n");
  });

  test("reclaims an incomplete lock from a previous command", async () => {
    const vault = await makeVault();
    const filePath = path.join(vault, "Tasks.md");
    const lockDirectory = path.join(os.tmpdir(), "talk-to-action-for-raycast-locks");
    const lockName = createHash("sha256").update(vault).update("\0").update("Tasks.md").digest("hex") + ".lock";
    await writeFile(filePath, "# Tasks\n");
    await mkdir(lockDirectory, { recursive: true });
    await writeFile(path.join(lockDirectory, lockName), "");

    await saveInput({
      vaultPath: vault,
      dailyNoteFolder: "",
      dailyNoteFileFormat: "YYYY-MM-DD",
      route: baseRoute,
      input: "Recovered incomplete lock",
    });

    expect(await readFile(filePath, "utf8")).toBe("# Tasks\n- [ ] Recovered incomplete lock\n");
  });

  test("does not create an Existing File target", async () => {
    const vault = await makeVault();
    await expect(
      saveInput({
        vaultPath: vault,
        dailyNoteFolder: "",
        dailyNoteFileFormat: "YYYY-MM-DD",
        route: baseRoute,
        input: "New",
      }),
    ).rejects.toThrow("Existing file was not found");
  });

  test("does not create a Daily Note target", async () => {
    const vault = await makeVault();
    await mkdir(path.join(vault, "Daily Note"));
    await expect(
      saveInput({
        vaultPath: vault,
        dailyNoteFolder: "Daily Note",
        dailyNoteFileFormat: "YYYY-MM-DD",
        route: { ...baseRoute, destination: "daily-note", filePath: "" },
        input: "New",
        now: new Date(2026, 7, 14),
      }),
    ).rejects.toThrow("Existing file was not found");
    await expect(readFile(path.join(vault, "Daily Note/2026-08-14.md"), "utf8")).rejects.toThrow("ENOENT");
  });

  test("rejects Vault escape paths and non-Markdown files", async () => {
    const vault = await makeVault();
    await expect(
      saveInput({
        vaultPath: vault,
        dailyNoteFolder: "",
        dailyNoteFileFormat: "YYYY-MM-DD",
        route: { ...baseRoute, filePath: "../outside.md" },
        input: "Blocked",
      }),
    ).rejects.toThrow("Vault");

    await expect(
      saveInput({
        vaultPath: vault,
        dailyNoteFolder: "",
        dailyNoteFileFormat: "YYYY-MM-DD",
        route: { ...baseRoute, filePath: "notes.txt" },
        input: "Blocked",
      }),
    ).rejects.toThrow("Markdown");
  });

  test("rejects a symlink that points outside the Vault", async () => {
    const vault = await makeVault();
    const outside = await mkdtemp(path.join(os.tmpdir(), "talk-to-action-raycast-outside-"));
    temporaryDirectories.push(outside);
    await symlink(outside, path.join(vault, "linked"));

    await expect(
      saveInput({
        vaultPath: vault,
        dailyNoteFolder: "",
        dailyNoteFileFormat: "YYYY-MM-DD",
        route: { ...baseRoute, filePath: "linked/escape.md" },
        input: "Blocked",
      }),
    ).rejects.toThrow("Vault");
  });
});

describe("additional route behavior", () => {
  test("does not modify a file when its requested heading is missing", async () => {
    const vault = await makeVault();
    const filePath = path.join(vault, "Tasks.md");
    await writeFile(filePath, "## Existing\n- [ ] Keep this\n");

    await expect(
      saveInput({
        vaultPath: vault,
        dailyNoteFolder: "",
        dailyNoteFileFormat: "YYYY-MM-DD",
        route: {
          ...baseRoute,
          section: "section-end",
          heading: "Missing",
        },
        input: "Blocked",
      }),
    ).rejects.toThrow('Heading "Missing" was not found');

    expect(await readFile(filePath, "utf8")).toBe("## Existing\n- [ ] Keep this\n");
  });
});
