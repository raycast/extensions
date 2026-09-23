import { strict as assert } from "node:assert";
import { mock, test } from "bun:test";

let language = "en";
mock.module("@raycast/api", () => ({ getPreferenceValues: () => ({ language }) }));
const { t, syncStatus } = await import("../src/lib/i18n");

test("language switch translates dynamic labels without changing protocol values", () => {
  assert.equal(t(`Imported ${3} accounts`, `已导入 ${3} 个账户`), "Imported 3 accounts");
  assert.equal(syncStatus("conflict"), "Conflict");
  language = "zh-Hans";
  assert.equal(t(`Imported ${3} accounts`, `已导入 ${3} 个账户`), "已导入 3 个账户");
  assert.equal(syncStatus("conflict"), "冲突");
  assert.equal(syncStatus("unknown"), "unknown");
});
