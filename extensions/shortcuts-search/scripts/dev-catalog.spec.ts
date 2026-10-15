import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

it.each([0, 7])("launches the Node CLI without npm executable shims and cleans up after exit %s", (exitCode) => {
  const directory = mkdtempSync(join(tmpdir(), "raycast catalog "));
  try {
    mkdirSync(join(directory, "assets"));
    mkdirSync(join(directory, "node_modules/@raycast/api/bin"), { recursive: true });
    copyFileSync(join(__dirname, "dev-catalog.mjs"), join(directory, "dev-catalog.mjs"));
    writeFileSync(
      join(directory, "node_modules/@raycast/api/bin/run.js"),
      `
      const fs = require("node:fs");
      console.log(JSON.stringify({ args: process.argv.slice(2), config: JSON.parse(fs.readFileSync("assets/catalog-development.json", "utf8")) }));
      process.exit(${exitCode});
    `
    );
    const result = spawnSync(process.execPath, ["dev-catalog.mjs", "--origin", "http://localhost:3000"], {
      cwd: directory,
      encoding: "utf8",
      timeout: 10000,
    });
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(exitCode);
    expect(JSON.parse(result.stdout)).toEqual({ args: ["develop"], config: { origin: "http://localhost:3000" } });
    expect(existsSync(join(directory, "assets/catalog-development.json"))).toBe(false);

    writeFileSync(join(directory, "assets/catalog-development.json"), "existing session");
    const duplicate = spawnSync(process.execPath, ["dev-catalog.mjs", "--origin", "http://localhost:3000"], {
      cwd: directory,
      encoding: "utf8",
      timeout: 10000,
    });
    expect(duplicate.status).toBe(1);
    expect(duplicate.stderr).toContain("A catalog development session already exists");
    expect(readFileSync(join(directory, "assets/catalog-development.json"), "utf8")).toBe("existing session");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
