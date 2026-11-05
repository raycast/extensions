import { strict as assert } from "node:assert";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { InstallPlan } from "../src/core/adapters/types";
import { applyPlan, installCli } from "../src/core/install";
import { tempDir } from "./helpers";

test("install CLI creates the destination directory, updates content and makes it executable", (t) => {
  const root = tempDir(t);
  const source = join(root, "source.mjs");
  const target = join(root, "nested", "bin", "agent-inbox.mjs");
  writeFileSync(source, "// first version\n");
  assert.equal(installCli(source, target), target);
  assert.equal(readFileSync(target, "utf8"), "// first version\n");
  assert.equal(statSync(target).mode & 0o777, 0o755);
  const mtime = statSync(target).mtimeMs;
  installCli(source, target);
  assert.equal(statSync(target).mtimeMs, mtime, "unchanged bundles are not copied again");
  writeFileSync(source, "// next version\n");
  installCli(source, target);
  assert.equal(readFileSync(target, "utf8"), "// next version\n");
});

test("applying a hook plan backs up existing config and skips unchanged files", (t) => {
  const root = tempDir(t);
  const existing = join(root, "settings.json");
  const created = join(root, "nested", "hooks.json");
  const unchanged = join(root, "config.toml");
  writeFileSync(existing, '{"model":"opus"}\n');
  writeFileSync(unchanged, 'model = "gpt-5"\n');
  const plan: InstallPlan = {
    notes: [],
    changes: [
      {
        path: existing,
        before: readFileSync(existing, "utf8"),
        after: '{"model":"opus","hooks":{}}\n',
        summary: "hooks",
        preview: "",
        previewLang: "json",
      },
      { path: created, before: "", after: "{}\n", summary: "hooks", preview: "", previewLang: "json" },
      {
        path: unchanged,
        before: readFileSync(unchanged, "utf8"),
        after: readFileSync(unchanged, "utf8"),
        summary: "notify",
        preview: "",
        previewLang: "toml",
      },
    ],
  };
  assert.deepEqual(applyPlan(plan), [existing, created]);
  assert.equal(readFileSync(existing + ".agent-inbox.bak", "utf8"), '{"model":"opus"}\n');
  assert.equal(readFileSync(existing, "utf8"), plan.changes[0].after);
  assert.equal(readFileSync(created, "utf8"), "{}\n");
  assert.equal(existsSync(created + ".agent-inbox.bak"), false);
  assert.equal(existsSync(unchanged + ".agent-inbox.bak"), false);
});
