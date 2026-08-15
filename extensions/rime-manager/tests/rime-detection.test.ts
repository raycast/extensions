import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { inspectRimeInstallation } from "../src/lib/rime";

test("detects enabled schemas and existing filter capabilities without distribution-specific logic", async () => {
  const root = await mkdtemp(join(tmpdir(), "raycast-rime-manager-test-"));
  try {
    await mkdir(join(root, "lua"));
    await Promise.all([
      writeFile(
        join(root, "installation.yaml"),
        'distribution_name: "Rime Frontend"\ndistribution_version: "1.1.2"\nrime_version: "1.16.0"\n',
      ),
      writeFile(join(root, "user.yaml"), "var:\n  last_build_time: 1\n"),
      writeFile(join(root, "default.custom.yaml"), "patch:\n  menu/page_size: 8\n"),
      writeFile(join(root, "default.yaml"), "schema_list:\n  - schema: custom_pinyin\n  - schema: double_pinyin\n"),
      writeFile(
        join(root, "custom_pinyin.schema.yaml"),
        "schema:\n  schema_id: custom_pinyin\n  name: Custom Pinyin\nengine:\n  filters:\n    - lua_filter@*pin_cand_filter\n",
      ),
      writeFile(
        join(root, "double_pinyin.schema.yaml"),
        "schema:\n  schema_id: double_pinyin\n  name: Double Pinyin\n",
      ),
      writeFile(join(root, "auxiliary.schema.yaml"), "schema:\n  schema_id: auxiliary\n  name: Auxiliary Schema\n"),
      writeFile(
        join(root, "custom_pinyin.custom.yaml"),
        'patch:\n  "engine/filters/@before last": lua_filter@*blocked_words_filter\n',
      ),
      writeFile(join(root, "lua", "blocked_words_filter.lua"), "return {}\n"),
    ]);

    const result = await inspectRimeInstallation({ rimeUserDirectory: root, reloadAfterChanges: true });
    assert.equal(result.currentSchemaId, "custom_pinyin");
    assert.deepEqual(
      result.schemas.map((schema) => schema.id),
      ["custom_pinyin", "double_pinyin"],
    );
    assert.equal(result.hasExistingBlockedWordsFilter, true);
    assert.equal(result.schemas[0].hasPinCandidateFilter, true);
    assert.equal(result.loweredWordsPath, join(result.userDataDir, "raycast_lowered_words.txt"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
