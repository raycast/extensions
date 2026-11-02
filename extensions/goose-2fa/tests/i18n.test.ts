import { strict as assert } from "node:assert";
import { test } from "bun:test";

const { t, syncStatus } = await import("../src/lib/i18n");

test("interface labels remain English without changing protocol values", () => {
  assert.equal(t(`Imported ${3} accounts`, `已导入 ${3} 个账户`), "Imported 3 accounts");
  assert.equal(syncStatus("conflict"), "Conflict");
  assert.equal(syncStatus("unknown"), "unknown");
});
