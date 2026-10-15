import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import test from "node:test";

test("两万条长网址在 64 MB old-space 内完成网址拼音的连续查询", async () => {
  await promisify(execFile)(
    process.execPath,
    [
      "--max-old-space-size=64",
      "--import",
      "tsx",
      path.join(__dirname, "fixtures/multi-field-memory-budget.ts"),
    ],
    { timeout: 60000 },
  );
});
