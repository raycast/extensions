import { describe, it, expect, afterEach } from "vitest";
import { mkdtemp, rm, writeFile } from "fs/promises";
import { homedir, tmpdir } from "os";
import { join } from "path";
import {
  migrate,
  displayPath,
  detectPackageManager,
  guessRunCommand,
  canonicalCwd,
  draftProfileFromPort,
  type Profile,
} from "../src/profiles";
import type { ListeningPort } from "../src/system";

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

/* ─── draftProfileFromPort: the port prefill rule ─── */

describe("draftProfileFromPort", () => {
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
});
