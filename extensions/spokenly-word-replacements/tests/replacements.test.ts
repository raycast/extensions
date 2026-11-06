import { mkdtemp, readFile, writeFile, chmod, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { findCLI, parseReplacements, SpokenlyCLI } from "../src/lib/replacements";

let directory: string;
let statePath: string;
let client: SpokenlyCLI;
const value = { original: "air pods", replacement: "AirPods", regex: false, timing: "before-ai" as const };

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "spokenly-replacements-test-"));
  statePath = join(directory, "state.json");
  await writeFile(statePath, "[]");
  const executable = join(directory, "spokenly-fixture");
  await writeFile(
    executable,
    `#!${process.execPath}
const fs = require("node:fs");
const path = ${JSON.stringify(statePath)};
const args = process.argv.slice(2);
const rules = JSON.parse(fs.readFileSync(path, "utf8"));
if (args[0] !== "replacements") process.exit(2);
if (args[1] === "list") { console.log(JSON.stringify(rules)); }
else if (args[1] === "add") {
  const timing = { "before-ai": "beforeAI", "after-ai": "afterAI", "both": "both" }[args[args.indexOf("--timing") + 1]];
  rules.push({ original: args[2], replacement: args[3], isRegex: args.includes("--regex"), timing });
  fs.writeFileSync(path, JSON.stringify(rules));
}
else if (args[1] === "remove") {
  fs.writeFileSync(path, JSON.stringify(rules.filter(r => r.original.toLowerCase() !== args[2].toLowerCase())));
} else process.exit(2);
`,
  );
  await chmod(executable, 0o755);
  client = new SpokenlyCLI(await findCLI(executable));
});

afterEach(async () => {
  await rm(directory, { recursive: true });
});

describe("official CLI boundary (local executable fixture)", () => {
  it("passes shell syntax as literal arguments and verifies add/remove by read-back", async () => {
    const original = '$(touch /tmp/should-never-exist) "quote" `backtick`';
    const replacement = "$1 stays literal\nNew line";
    expect(await client.add({ ...value, original, replacement, regex: true, timing: "both" })).toEqual({ settingsVerified: true });
    expect(await client.list()).toEqual([{ original, replacement, isRegex: true, timing: "both" }]);
    expect(await client.remove(original)).toBe(1);
    expect(await client.list()).toEqual([]);
  });

  it("refuses to overwrite a case-insensitive duplicate", async () => {
    await writeFile(statePath, JSON.stringify([{ original: "AIR PODS", replacement: "Existing" }]));
    await expect(client.add(value)).rejects.toThrow("already exists");
    expect(JSON.parse(await readFile(statePath, "utf8"))).toEqual([{ original: "AIR PODS", replacement: "Existing" }]);
  });

  it("allows empty replacement text and removes all case-insensitive matches", async () => {
    await client.add({ ...value, replacement: "" });
    await writeFile(statePath, JSON.stringify([...(await client.list()), { original: "AIR PODS", replacement: "duplicate" }]));
    expect(await client.remove("Air Pods")).toBe(2);
    expect(await client.list()).toEqual([]);
  });

  it("never reports a write as verified when the app does not save it", async () => {
    const executable = join(directory, "no-op-cli");
    await writeFile(executable, `#!${process.execPath}\nif(process.argv[3] === "list") console.log("[]");\n`);
    await chmod(executable, 0o755);
    await expect(new SpokenlyCLI(executable).add(value)).rejects.toThrow("not found on read-back");
  });

  it("rejects dash-prefixed inputs before invoking a mutation", async () => {
    await expect(client.add({ ...value, original: "--regex" })).rejects.toThrow("beginning with a dash");
    await expect(client.add({ ...value, replacement: "--timing" })).rejects.toThrow("beginning with a dash");
    expect(await client.list()).toEqual([]);
  });

  it("rejects a read-back with different matching flags", async () => {
    const executable = join(directory, "wrong-flags-cli");
    await writeFile(executable, `#!${process.execPath}\nconst fs=require("node:fs"); const path=${JSON.stringify(statePath)}; if(process.argv[3] === "list") console.log(fs.readFileSync(path,"utf8")); else fs.writeFileSync(path,JSON.stringify([{original:"air pods",replacement:"AirPods",isRegex:true,timing:"beforeAI"}]));\n`);
    await chmod(executable, 0o755);
    await expect(new SpokenlyCLI(executable).add(value)).rejects.toThrow("different matching settings");
  });

  it("marks text-only read-back as partial verification when flags are absent", async () => {
    const executable = join(directory, "text-only-cli");
    await writeFile(executable, `#!${process.execPath}\nconst fs=require("node:fs"); const path=${JSON.stringify(statePath)}; if(process.argv[3] === "list") console.log(fs.readFileSync(path,"utf8")); else fs.writeFileSync(path,JSON.stringify([{original:"air pods",replacement:"AirPods"}]));\n`);
    await chmod(executable, 0o755);
    expect(await new SpokenlyCLI(executable).add(value)).toEqual({ settingsVerified: false });
  });
});

describe("setup and response validation", () => {
  it("preserves unknown vendor fields for JSON backups", () => {
    expect(parseReplacements('[{"original":"a","replacement":"b","future":{"flag":true}}]')).toEqual([
      { original: "a", replacement: "b", future: { flag: true } },
    ]);
  });

  it("fails clearly for malformed or unsupported JSON instead of showing an empty list", () => {
    expect(() => parseReplacements("not JSON")).toThrow("valid replacement JSON");
    expect(() => parseReplacements('{"error":"offline"}')).toThrow("unsupported replacement format");
    expect(() => parseReplacements('[{"original":"a"}]')).toThrow("unsupported replacement format");
  });

  it("distinguishes a missing executable from a relative path", async () => {
    await expect(findCLI(join(directory, "not-installed"))).rejects.toThrow("Install the official CLI");
    await expect(findCLI("relative/spokenly")).rejects.toThrow("absolute path");
  });
});
