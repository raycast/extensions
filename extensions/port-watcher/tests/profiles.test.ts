import { describe, it, expect, afterEach } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "fs/promises";
import { homedir, tmpdir } from "os";
import { join } from "path";
import {
  migrate,
  displayPath,
  detectPackageManager,
  guessRunCommand,
  canonicalCwd,
  draftProfileFromPort,
  collectCandidates,
  checkProjectFolder,
  parseProfilesFile,
  runnerOf,
  type Profile,
} from "../src/profiles";
import type { ListeningPort } from "../src/system";

/* ─── parseProfilesFile: an unreadable file must never read as an empty one ─── */

describe("parseProfilesFile", () => {
  it("reads the shape writeProfiles produces", () => {
    const raw = JSON.stringify({ version: 1, profiles: [{ id: "a", cwd: "/proj", run: "npm run dev", port: 3000 }] });
    expect(parseProfilesFile(raw)).toEqual([{ id: "a", cwd: "/proj", run: "npm run dev", port: 3000 }]);
  });

  it("passes each profile through migrate, so dead schemas still load", () => {
    const raw = JSON.stringify({ version: 1, profiles: [{ id: "a", root: "/repo", directory: "site", run: "x" }] });
    expect(parseProfilesFile(raw)[0].cwd).toBe("/repo/site");
  });

  it("reads an empty list as an empty list — that one is not a failure", () => {
    expect(parseProfilesFile(JSON.stringify({ version: 1, profiles: [] }))).toEqual([]);
  });

  it("throws on a stray comma rather than reporting no profiles", () => {
    expect(() => parseProfilesFile('{"profiles": [],}')).toThrow();
  });

  // The regression: this used to return [] — so a mistyped key showed "no
  // profiles" and you believed they were lost, while a stray comma got a red row
  // naming the file. Same disaster, opposite treatment.
  it("throws when the file parses but holds no profile list", () => {
    expect(() => parseProfilesFile(JSON.stringify({ version: 1, profile: [] }))).toThrow(/profiles/);
  });

  it("throws when profiles is present but not an array", () => {
    expect(() => parseProfilesFile(JSON.stringify({ profiles: { a: 1 } }))).toThrow(/profiles/);
  });

  it("throws on a file holding something else entirely", () => {
    expect(() => parseProfilesFile('"just a string"')).toThrow(/profiles/);
  });

  // The id becomes a log filename. A crafted profiles.json — the file is meant to
  // be dotfile-syncable, so it can arrive unauthored — could point it outside the
  // logs folder. A broken id is a broken file, refused like a broken shape.
  it("refuses an id that would traverse out of the logs folder", () => {
    const raw = JSON.stringify({ profiles: [{ id: "../../../../tmp/pwned", cwd: "/p", run: "x" }] });
    expect(() => parseProfilesFile(raw)).toThrow(/identifier/);
  });

  it("refuses an id with a path separator, and an empty one", () => {
    expect(() => parseProfilesFile(JSON.stringify({ profiles: [{ id: "a/b", cwd: "/p", run: "x" }] }))).toThrow();
    expect(() => parseProfilesFile(JSON.stringify({ profiles: [{ cwd: "/p", run: "x" }] }))).toThrow(/identifier/);
  });

  it("accepts a real randomUUID-shaped id", () => {
    const raw = JSON.stringify({ profiles: [{ id: "3f2b1c4a-9d8e-4f6a-b2c1-0e5d7a9c8b3f", cwd: "/p", run: "x" }] });
    expect(parseProfilesFile(raw)[0].id).toBe("3f2b1c4a-9d8e-4f6a-b2c1-0e5d7a9c8b3f");
  });
});

/* ─── runnerOf: what actually runs, past the environment prefix ─── */

describe("runnerOf", () => {
  it("reads a bare command", () => {
    expect(runnerOf("npm run dev")).toBe("npm");
  });

  // The regression: read blind, this returned "PORT=3000", which matches no
  // runner — so the guard rail went quiet on a shape launch.ts blesses by name.
  it("steps over an environment assignment", () => {
    expect(runnerOf("PORT=3000 npm run dev")).toBe("npm");
  });

  it("steps over several of them", () => {
    expect(runnerOf("PORT=3000 NODE_ENV=development npm run dev")).toBe("npm");
  });

  it("is not fooled by an = inside the value", () => {
    expect(runnerOf("FOO=a=b npm run dev")).toBe("npm");
  });

  it("does not mistake a flag for an assignment", () => {
    expect(runnerOf("vite --port=3000")).toBe("vite");
  });

  it("has no answer when nothing but assignments is left", () => {
    expect(runnerOf("PORT=3000")).toBeUndefined();
  });

  it("has no answer for an empty line", () => {
    expect(runnerOf("   ")).toBeUndefined();
  });
});

/* ─── canonicalCwd: profile folders must speak lsof's language ─── */

describe("canonicalCwd", () => {
  it("resolves a symlinked path to the physical one lsof reports", async () => {
    // /tmp -> /private/tmp on every macOS: the realest fixture there is.
    expect(await canonicalCwd("/tmp")).toBe("/private/tmp");
  });

  it("keeps an unresolvable path as-is rather than failing", async () => {
    expect(await canonicalCwd("/nonexistent-folder-xyz")).toBe("/nonexistent-folder-xyz");
  });
});

/* ─── migrate: the two dead schemas must keep collapsing correctly ─── */

describe("migrate", () => {
  it("passes a current-schema profile through untouched", () => {
    expect(migrate({ id: "a", cwd: "/p/site", run: "npm run dev", port: 3000 })).toEqual({
      id: "a",
      cwd: "/p/site",
      run: "npm run dev",
      port: 3000,
    });
  });

  it("omits the port key entirely when absent, rather than storing undefined", () => {
    expect(migrate({ id: "a", cwd: "/p", run: "x" })).not.toHaveProperty("port");
  });

  it("collapses the root + directory split into one cwd", () => {
    expect(migrate({ id: "a", root: "/p/repo", directory: "site", run: "x" }).cwd).toBe("/p/repo/site");
  });

  it("uses root alone as the cwd when directory is absent", () => {
    expect(migrate({ id: "a", root: "/p/repo", run: "x" }).cwd).toBe("/p/repo");
  });

  it("prefers root over a stale cwd: root is the newer shape", () => {
    expect(migrate({ id: "a", cwd: "/old", root: "/new", run: "x" }).cwd).toBe("/new");
  });

  it("drops the dead name field without failing", () => {
    const migrated = migrate({ id: "a", cwd: "/p", run: "x", name: "site" } as Parameters<typeof migrate>[0]);
    expect(migrated).not.toHaveProperty("name");
    expect(migrated.cwd).toBe("/p");
  });
});

/* ─── displayPath ─── */

describe("displayPath", () => {
  const home = homedir();

  it("shortens paths under home to ~", () => {
    expect(displayPath(join(home, "Projects", "site"))).toBe("~/Projects/site");
  });

  it("renders home itself as ~", () => {
    expect(displayPath(home)).toBe("~");
  });

  it("leaves paths outside home untouched", () => {
    expect(displayPath("/opt/site")).toBe("/opt/site");
  });

  it("does not shorten a sibling of home that merely shares the prefix", () => {
    expect(displayPath(home + "-backup/site")).toBe(home + "-backup/site");
  });
});

/* ─── detectPackageManager: real folders, real lockfiles ─── */

describe("detectPackageManager", () => {
  const dirs: string[] = [];

  async function folderWith(files: string[]): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), "pw-test-"));
    dirs.push(dir);
    for (const f of files) await writeFile(join(dir, f), "");
    return dir;
  }

  afterEach(async () => {
    await Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })));
  });

  it.each([
    ["bun.lock", "bun"],
    ["bun.lockb", "bun"],
    ["pnpm-lock.yaml", "pnpm"],
    ["yarn.lock", "yarn"],
    ["package-lock.json", "npm"],
  ])("reads %s as %s", async (lockfile, pm) => {
    expect(await detectPackageManager(await folderWith([lockfile]))).toBe(pm);
  });

  it("falls back to npm when no lockfile exists", async () => {
    expect(await detectPackageManager(await folderWith([]))).toBe("npm");
  });
});

/* ─── guessRunCommand: from a resolved command line back to the script ─── */

describe("guessRunCommand", () => {
  const dirs: string[] = [];

  async function projectWith(scripts: Record<string, string>, extraFiles: string[] = []): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), "pw-test-"));
    dirs.push(dir);
    await writeFile(join(dir, "package.json"), JSON.stringify({ scripts }));
    for (const f of extraFiles) await writeFile(join(dir, f), "");
    return dir;
  }

  afterEach(async () => {
    await Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })));
  });

  it("walks back from the resolved binary to the npm script", async () => {
    const dir = await projectWith({ dev: "vite" });
    expect(await guessRunCommand(dir, `node ${dir}/node_modules/.bin/vite`)).toBe("npm run dev");
  });

  it("prefers the exact script value over a first-token match", async () => {
    const dir = await projectWith({ build: "vite build", dev: "vite" });
    expect(await guessRunCommand(dir, `node ${dir}/node_modules/.bin/vite`)).toBe("npm run dev");
  });

  it("falls back to the first-token match when nothing matches exactly", async () => {
    const dir = await projectWith({ dev: "vite --host" });
    expect(await guessRunCommand(dir, `node ${dir}/node_modules/.bin/vite`)).toBe("npm run dev");
  });

  it("uses the package manager the lockfile names, never a hardcoded npm", async () => {
    const dir = await projectWith({ dev: "vite" }, ["pnpm-lock.yaml"]);
    expect(await guessRunCommand(dir, `node ${dir}/node_modules/.bin/vite`)).toBe("pnpm run dev");
  });

  it("gives no guess when the command line has no node_modules/.bin token", async () => {
    const dir = await projectWith({ dev: "vite" });
    expect(await guessRunCommand(dir, "node server.js")).toBeUndefined();
  });

  it("gives no guess without a command line at all", async () => {
    expect(await guessRunCommand("/nowhere", undefined)).toBeUndefined();
  });
});

/* ─── collectCandidates: the product's opinion on how to start things ─── */

// Tested through collectCandidates rather than suggestRunCommand on purpose:
// suggestRunCommand filters through isAvailable, which asks the login shell what
// is installed — that would make these assertions depend on the machine running
// them. The table itself only reads the disk, so it is decidable.
describe("collectCandidates", () => {
  const dirs: string[] = [];

  async function folderWith(files: Record<string, string>): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), "pw-test-"));
    dirs.push(dir);
    for (const [name, body] of Object.entries(files)) await writeFile(join(dir, name), body);
    return dir;
  }

  afterEach(async () => {
    await Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })));
  });

  // The regression that started all this: every static site was handed 8000, so
  // two of them collided by construction and the second died on "Address already
  // in use". No suggestion may name a port again.
  it("never names a port for a static site — two of them used to collide on 8000", async () => {
    const candidates = await collectCandidates(await folderWith({ "index.html": "<h1>hi</h1>" }));

    expect(candidates.length).toBeGreaterThan(0);
    for (const { command } of candidates) {
      expect(command).not.toMatch(/8000/);
      // 0 means "any free port": the kernel picks, and the live port is read
      // back from the system like every other port in this extension.
      expect(command).toMatch(/(\s0\b|:0\b)/);
    }
  });

  it("keeps every static server on loopback — serve carries its host in the listen URL", async () => {
    const candidates = await collectCandidates(await folderWith({ "index.html": "<h1>hi</h1>" }));

    // The guard the loop below cannot do without: an empty list would satisfy a
    // `for` of assertions without running one, and this is the security test of
    // the suite — the regression it must catch is precisely a static block that
    // stops producing what we expect.
    expect(candidates.length).toBeGreaterThan(0);

    // Not decoration: without an explicit host these servers bind every
    // interface, which is the café-wifi problem.
    for (const { command } of candidates) expect(command).toContain("127.0.0.1");

    // `serve` was the one that did not carry a host, so it bound `*` and our own
    // LAN tag flagged our own suggestion. Its host lives in the listen URL, not
    // in a flag — pinned by name, because that is the shape that was wrong.
    expect(candidates.map((c) => c.command)).toContain("npx serve --listen tcp://127.0.0.1:0");
    // And never with --yes: that would let the suggestion pull from the network
    // on its own, unprompted.
    expect(candidates.every((c) => !c.command.includes("--yes"))).toBe(true);
  });

  it("does not name a port for a PHP project either — same flaw, same fix", async () => {
    const [candidate] = await collectCandidates(await folderWith({ "composer.json": "{}" }));
    expect(candidate.command).toBe("php -S 127.0.0.1:0");
  });

  it("puts the framework first and the static fallback last: vite folders hold an index.html too", async () => {
    const dir = await folderWith({
      "index.html": "<h1>hi</h1>",
      "package.json": JSON.stringify({ scripts: { dev: "vite" } }),
    });
    const commands = (await collectCandidates(dir)).map((c) => c.command);

    expect(commands[0]).toBe("npm run dev");
    expect(commands.at(-1)).toMatch(/php|ruby|serve|http\.server/);
  });

  it("offers nothing for a folder that says nothing about itself", async () => {
    expect(await collectCandidates(await folderWith({ "notes.txt": "hello" }))).toEqual([]);
  });
});

/* ─── checkProjectFolder: the guard rail, non-blocking by design ─── */

describe("checkProjectFolder", () => {
  const dirs: string[] = [];

  async function folder(files: Record<string, string> = {}, subfolders: Record<string, string[]> = {}): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), "pw-test-"));
    dirs.push(dir);
    for (const [name, body] of Object.entries(files)) await writeFile(join(dir, name), body);
    for (const [sub, names] of Object.entries(subfolders)) {
      await mkdir(join(dir, sub));
      for (const name of names) await writeFile(join(dir, sub, name), "{}");
    }
    return dir;
  }

  afterEach(async () => {
    await Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })));
  });

  it("says nothing when the runner has the package.json it needs", async () => {
    expect(await checkProjectFolder(await folder({ "package.json": "{}" }), "npm run dev")).toBeUndefined();
  });

  it("warns when a node runner points at a folder with no package.json", async () => {
    const warning = await checkProjectFolder(await folder(), "npm run dev");
    expect(warning).toMatch(/No package.json/);
  });

  // The regression: the runner was read as "PORT=3000", matched no runner list,
  // and the guard rail returned "nothing to check" — silently, on a command
  // launch.ts blesses by name.
  it("still fires when the command opens with an environment assignment", async () => {
    const warning = await checkProjectFolder(await folder(), "PORT=3000 npm run dev");
    expect(warning).toMatch(/No package.json/);
    expect(warning).toContain("npm");
  });

  it("points at the subfolder that does have a package.json", async () => {
    const dir = await folder({}, { site: ["package.json"] });
    const warning = await checkProjectFolder(dir, "PORT=3000 pnpm run dev");
    expect(warning).toContain("site");
    expect(warning).toContain("pnpm");
  });

  it("keeps quiet about commands it cannot judge — it never claimed to read them all", async () => {
    expect(await checkProjectFolder(await folder(), "python3 -m http.server 0")).toBeUndefined();
    expect(await checkProjectFolder(await folder(), "cargo run")).toBeUndefined();
  });

  it("keeps quiet when the line is nothing but assignments", async () => {
    expect(await checkProjectFolder(await folder(), "PORT=3000")).toBeUndefined();
  });
});

/* ─── draftProfileFromPort: the port prefill rule ─── */

describe("draftProfileFromPort", () => {
  const dirs: string[] = [];

  afterEach(async () => {
    await Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })));
  });

  const running: ListeningPort = {
    command: "node",
    pid: "1",
    port: "5173",
    address: "127.0.0.1",
    kind: "project",
    cwd: "/proj",
  };

  it("leaves the port empty on a first capture — nothing to disambiguate yet", async () => {
    const draft = await draftProfileFromPort(running, []);
    expect(draft.cwd).toBe("/proj");
    expect(draft).not.toHaveProperty("port");
  });

  it("prefills the port when a profile already claims the folder — its one job", async () => {
    const sibling: Profile = { id: "a", cwd: "/proj", run: "npm run dev" };
    expect((await draftProfileFromPort(running, [sibling])).port).toBe(5173);
  });

  it("ignores profiles in other folders when deciding", async () => {
    const other: Profile = { id: "a", cwd: "/elsewhere", run: "npm run dev" };
    expect(await draftProfileFromPort(running, [other])).not.toHaveProperty("port");
  });

  // The fixtures above carry no fullCommand, so guessRunCommand returns before
  // it reads anything and `run` is always "". They pin the port rule and nothing
  // else — yet `run` is the ONE field a draft guesses, and the reason the
  // function exists. This is the composition actually running.
  it("walks back to the npm script behind the process — the one field it guesses", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pw-test-"));
    dirs.push(dir);
    await writeFile(join(dir, "package.json"), JSON.stringify({ scripts: { dev: "vite", build: "vite build" } }));

    const draft = await draftProfileFromPort(
      { ...running, cwd: dir, fullCommand: `node ${dir}/node_modules/.bin/vite` },
      [],
    );

    expect(draft.run).toBe("npm run dev");
  });

  it("leaves run empty rather than invent one when nothing points at a script", async () => {
    const draft = await draftProfileFromPort({ ...running, fullCommand: "node server.js" }, []);
    expect(draft.run).toBe("");
  });
});
