import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  addLearnResource,
  createLearnWorkspace,
  listLearnResources,
  removeLearnResource,
  updateLearnTags,
} from "./learn-cli.js";
import { ingestTerminalCommand, startIngestion } from "./ingestion.js";

const mocks = vi.hoisted(() => ({ runAppleScript: vi.fn() }));
vi.mock("@raycast/utils", () => ({ runAppleScript: mocks.runAppleScript }));

const testDir = fs.mkdtempSync(
  path.join(os.tmpdir(), "learn-raycast-integration-"),
);
const testHome = path.join(testDir, "home");
const executable = path.join(testDir, "learn wrapper");
const cli = path.resolve(import.meta.dirname, "../../cli/dist/cli.js");
const workspace = "raycast papers";
const source = "https://example.com/article?x=1&y=2";

beforeAll(() => {
  fs.mkdirSync(testHome);
  // Isolate CLI data without changing the interactive process's HOME.
  fs.writeFileSync(
    executable,
    `#!/usr/bin/env node\nconst {spawnSync}=require('node:child_process');const result=spawnSync(${JSON.stringify(process.execPath)},[${JSON.stringify(cli)},...process.argv.slice(2)],{env:{...process.env,HOME:${JSON.stringify(testHome)}},stdio:'inherit'});process.exit(result.status??1);\n`,
    { mode: 0o755 },
  );
});
afterAll(() => fs.rmSync(testDir, { recursive: true, force: true }));

// Raycast Store checks run in a standalone extension without the monorepo CLI.
describe.skipIf(!fs.existsSync(cli))(
  "Raycast operations with the real CLI",
  () => {
    it("creates, adds, lists, replaces tags including option-like removals, and keeps content on removal", async () => {
      await createLearnWorkspace(workspace, executable);
      await addLearnResource(
        workspace,
        source,
        "Article's title",
        ["w", "-workspace", "old"],
        executable,
      );
      let data = await listLearnResources(workspace, executable);
      expect(data.resources[0]).toMatchObject({
        source,
        title: "Article's title",
        status: "pending",
        tags: ["w", "-workspace", "old"],
      });
      await updateLearnTags(
        workspace,
        data.resources[0],
        ["中文", "reading"],
        executable,
      );
      data = await listLearnResources(workspace, executable);
      expect(data.resources[0].tags).toEqual(["中文", "reading"]);
      // The UI's original snapshot can be stale; replacements read current tags.
      await updateLearnTags(
        workspace,
        { ...data.resources[0], tags: ["stale"] },
        [],
        executable,
      );
      expect(
        (await listLearnResources(workspace, executable)).resources[0].tags,
      ).toEqual([]);
      const output = path.join(data.path, "web", "article.md");
      fs.writeFileSync(output, "# Article");
      const entry = JSON.parse(
        fs.readFileSync(path.join(data.path, "resources.json"), "utf8"),
      );
      entry.resources[0].output = "web/article.md";
      fs.writeFileSync(
        path.join(data.path, "resources.json"),
        JSON.stringify(entry),
      );
      await removeLearnResource(workspace, source, false, executable);
      expect(
        (await listLearnResources(workspace, executable)).resources,
      ).toEqual([]);
      expect(fs.existsSync(output)).toBe(true);
    });
    it("purges generated content and reports duplicates and missing workspaces", async () => {
      await addLearnResource(workspace, source, "", [], executable);
      await expect(
        addLearnResource(workspace, source, "", [], executable),
      ).rejects.toThrow("already exists");
      const data = await listLearnResources(workspace, executable);
      const entry = JSON.parse(
        fs.readFileSync(path.join(data.path, "resources.json"), "utf8"),
      );
      entry.resources[0].output = "web/article.md";
      fs.writeFileSync(
        path.join(data.path, "resources.json"),
        JSON.stringify(entry),
      );
      await removeLearnResource(workspace, source, true, executable);
      expect(fs.existsSync(path.join(data.path, "web/article.md"))).toBe(false);
      await expect(listLearnResources("missing", executable)).rejects.toThrow(
        "does not exist",
      );
    });
  },
);

describe("Terminal ingestion", () => {
  it("passes quoted operands literally to a shell", () => {
    const fakeExecutable = path.join(testDir, "fake cli");
    fs.writeFileSync(
      fakeExecutable,
      "#!/usr/bin/env node\nconsole.log(JSON.stringify(process.argv.slice(2)))\n",
      { mode: 0o755 },
    );
    const tricky = "papers' $(touch /tmp/raycast-injection) `id`; 中文";
    const result = execFileSync(
      "/bin/sh",
      ["-c", ingestTerminalCommand(fakeExecutable, tricky, "pi")],
      { encoding: "utf8" },
    );
    expect(JSON.parse(result)).toEqual([
      "ingest",
      "--workspace",
      tricky,
      "--agent",
      "pi",
    ]);
  });
  it("passes the command as AppleScript argv rather than interpolating code", async () => {
    await startIngestion(executable, workspace, "codex");
    expect(mocks.runAppleScript.mock.calls[0][0]).toContain(
      "do script (item 1 of argv)",
    );
    expect(mocks.runAppleScript.mock.calls[0][1]).toEqual([
      ingestTerminalCommand(executable, workspace, "codex"),
    ]);
  });
});
