import { afterEach, beforeAll, describe, expect, test } from "bun:test";
import { mkdtemp, readdir, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { raycastState } from "./raycast-mock";

type OutputActions = typeof import("../src/lib/output-actions");
let outputActions: OutputActions;
const temporaryPaths: string[] = [];

beforeAll(async () => {
  outputActions = await import("../src/lib/output-actions");
});

afterEach(async () => {
  raycastState.clipboard = "";
  await Promise.all(temporaryPaths.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

async function temporarySupportPath() {
  const path = await mkdtemp(join(tmpdir(), "executor-output-actions-"));
  temporaryPaths.push(path);
  return path;
}

describe("output actions", () => {
  test("confirms and copies exact text", async () => {
    const confirmation = outputActions.outputActionConfirmation({ operation: "copy-text", content: "exact text" });
    expect(confirmation.info).toEqual([
      { name: "Operation", value: "copy-text" },
      { name: "Text", value: "exact text" },
    ]);

    const result = await outputActions.performOutputAction({ operation: "copy-text", content: "exact text" });
    expect(result).toEqual({ copied: true, operation: "copy-text", characters: 10 });
    expect(raycastState.clipboard).toBe("exact text");
  });

  test("pretty-prints JSON before confirmation and clipboard mutation", async () => {
    const input = { operation: "copy-json" as const, content: '{"nested":{"value":1},"ok":true}' };
    const formatted = '{\n  "nested": {\n    "value": 1\n  },\n  "ok": true\n}';
    expect(outputActions.outputActionConfirmation(input).info?.[1].value).toBe(formatted);
    await outputActions.performOutputAction(input);
    expect(raycastState.clipboard).toBe(formatted);
  });

  test("rejects invalid JSON before creating an export directory", async () => {
    const supportPath = await temporarySupportPath();
    await expect(outputActions.exportResultJson("not json", { supportPath })).rejects.toThrow("valid JSON");
    expect(await readdir(supportPath)).toEqual([]);
  });

  test("writes one private UUID export and preserves success when reveal fails", async () => {
    const supportPath = await temporarySupportPath();
    let revealCalls = 0;
    const result = await outputActions.exportResultJson('{"ok":true}', {
      supportPath,
      id: () => "00000000-0000-4000-8000-000000000001",
      reveal: async () => {
        revealCalls += 1;
        throw new Error("Synthetic Finder failure");
      },
    });

    const directory = join(supportPath, "exports");
    expect(result).toEqual({
      exported: true,
      path: join(directory, "executor-result-00000000-0000-4000-8000-000000000001.json"),
      revealed: false,
      revealUnavailable: "Synthetic Finder failure",
    });
    expect(revealCalls).toBe(1);
    expect(await readdir(directory)).toEqual(["executor-result-00000000-0000-4000-8000-000000000001.json"]);
    expect(await readFile(result.path, "utf8")).toBe('{\n  "ok": true\n}');
    expect((await stat(directory)).mode & 0o777).toBe(0o700);
    expect((await stat(result.path)).mode & 0o777).toBe(0o600);
  });
});
