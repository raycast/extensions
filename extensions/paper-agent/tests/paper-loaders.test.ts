import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import yaml from "js-yaml";
import { resolveDeliveryDirs } from "../src/config-utils";
import { loadTodayPapers, loadRecentPapers, loadSearchResults } from "../src/paper-loaders";

for (const preference of ["", "override"]) {
  for (const command of ["today", "list", "search"]) {
    test(`${command} queries the core with ${preference ? "a preference override" : "YAML-only directories"}`, async (t) => {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), "paper-agent-loader-"));
      t.after(() => fs.rmSync(root, { recursive: true, force: true }));
      const configPath = path.join(root, "config.yaml");
      const original = yaml.dump({ delivery: { paper_dir: "papers", library_dir: "custom-library" } });
      fs.writeFileSync(configPath, original);
      const pythonBin = path.join(root, "fake-python");
      const capture = path.join(root, "invocation.json");
      fs.writeFileSync(
        pythonBin,
        `#!${process.execPath}
const fs = require("node:fs");
const args = process.argv.slice(2);
const configPath = args[args.indexOf("--config") + 1];
fs.writeFileSync(${JSON.stringify(capture)}, JSON.stringify({ args, cwd: process.cwd(), configPath, config: fs.readFileSync(configPath, "utf8") }));
process.stdout.write(JSON.stringify([{ id: "example", title: "Existing paper", note_path: "note.md" }]));
`,
        { mode: 0o755 },
      );
      const options = {
        configPath,
        prefPaperDir: preference,
        ...resolveDeliveryDirs(configPath, preference),
        pythonBin,
        agentRoot: root,
        signal: new AbortController().signal,
      };
      const papers =
        command === "today"
          ? await loadTodayPapers(options)
          : command === "list"
            ? await loadRecentPapers({ ...options, limit: 7 })
            : await loadSearchResults("graph attention", options);
      assert.equal(papers.length, 1);
      assert.equal(papers[0].title, "Existing paper");
      assert.equal(papers[0].notePath, path.join(root, preference || "papers", "note.md"));
      const invocation = JSON.parse(fs.readFileSync(capture, "utf8"));
      assert.deepEqual(invocation.args.slice(0, 3), ["-m", "paper_agent", command]);
      assert.equal(fs.realpathSync(invocation.cwd), fs.realpathSync(root));
      if (command === "list") assert.equal(invocation.args[invocation.args.indexOf("--limit") + 1], "7");
      if (command === "search")
        assert.equal(invocation.args[invocation.args.indexOf("--query") + 1], "graph attention");
      assert.deepEqual(yaml.load(invocation.config), {
        delivery: {
          paper_dir: preference || "papers",
          library_dir: preference ? "override/library" : "custom-library",
        },
      });
      assert.equal(fs.existsSync(invocation.configPath), false);
      assert.equal(fs.readFileSync(configPath, "utf8"), original);
    });
  }
}
