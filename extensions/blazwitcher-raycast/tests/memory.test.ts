import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import test from "node:test";

test("两万条长 URL 历史在 64 MB old-space 上限内完成连续拼音查询", async () => {
  await promisify(execFile)(
    process.execPath,
    [
      "--max-old-space-size=64",
      "--import",
      "tsx",
      path.join(__dirname, "fixtures/memory-budget.ts"),
    ],
    { timeout: 60000 },
  );
});
