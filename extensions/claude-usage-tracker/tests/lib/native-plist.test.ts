import { execFileSync } from "child_process";
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fixture from "../fixtures/profiles.json";
import { PlistNotFoundError, readProfilesPlist } from "../../src/lib/plist";
import { parseProfiles } from "../../src/lib/profiles";

const ACTIVE = "00000000-0000-0000-0000-000000000001";

/** Builds real binary plists with `plutil`, shaped like the app's preferences file. */
describe.runIf(process.platform === "darwin")("readProfilesPlist", () => {
  let dir: string;
  const plist = (name: string) => join(dir, name);
  const create = (name: string) => execFileSync("/usr/bin/plutil", ["-create", "binary1", plist(name)]);
  const insert = (name: string, key: string, type: string, value: string) =>
    execFileSync("/usr/bin/plutil", ["-insert", key, type, value, plist(name)]);

  beforeAll(() => {
    dir = realpathSync(mkdtempSync(join(tmpdir(), "claude-usage-plist-")));
    create("full.plist");
    insert("full.plist", "profiles_v3", "-data", Buffer.from(JSON.stringify(fixture)).toString("base64"));
    insert("full.plist", "activeProfileId", "-string", ACTIVE);
    create("empty.plist");
    insert("empty.plist", "firstLaunchDate", "-string", "2026-01-01");
    create("corrupt.plist");
    insert("corrupt.plist", "profiles_v3", "-data", Buffer.from("{not json").toString("base64"));
    writeFileSync(plist("broken.plist"), Buffer.from("bplist00\x00\xff\xffbroken", "latin1"));
  });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it("decodes the JSON stored as Data and the active profile id", async () => {
    const raw = await readProfilesPlist(plist("full.plist"));
    expect(raw.activeProfileId).toBe(ACTIVE);
    expect(raw.profiles).toEqual(fixture);
    expect(parseProfiles(raw.profiles, raw.activeProfileId)[0]).toMatchObject({ name: "Work", active: true });
  });

  it("reports no profiles when the app has not created any", async () => {
    expect(await readProfilesPlist(plist("empty.plist"))).toEqual({ profiles: undefined, activeProfileId: undefined });
  });

  it("reports a file that cannot be read instead of treating it as empty", async () => {
    await expect(readProfilesPlist(plist("broken.plist"))).rejects.toThrow("Could not read the Claude Usage preferences");
  });

  it("fails when the stored profiles cannot be decoded", async () => {
    await expect(readProfilesPlist(plist("corrupt.plist"))).rejects.toThrow("Could not decode");
  });

  it("fails with a dedicated error when the file does not exist", async () => {
    await expect(readProfilesPlist(plist("missing.plist"))).rejects.toBeInstanceOf(PlistNotFoundError);
    await expect(readProfilesPlist(null)).rejects.toBeInstanceOf(PlistNotFoundError);
  });
});
