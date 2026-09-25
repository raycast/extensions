import { afterEach, describe, expect, test } from "bun:test";
import {
  access,
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { YapsCli, YapsNoteNotFoundError } from "../src/lib/yaps-cli-core";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("YapsCli response contracts", () => {
  test("sorts listed notes and forwards search results", async () => {
    const fixture = await createFixtureCli();
    const cli = fixtureClient(fixture);

    const notes = await cli.listNotes(2);
    const search = await cli.searchNotes("launch plan", 5);

    expect(notes.map((note) => note.id)).toEqual(["newer", "older"]);
    expect(search.hits[0]?.path).toBe("Projects/Launch.md");
  });

  test("unwraps note envelopes returned by get and create", async () => {
    const fixture = await createFixtureCli();
    const cli = fixtureClient(fixture);

    const fetched = await cli.getNote("Inbox/Fetched.md");
    const created = await cli.createClipboardNote(
      "Captured thought",
      "Private clipboard text\n",
      " Projects / Notes ",
    );

    expect(fetched.path).toBe("Inbox/Fetched.md");
    expect(created.path).toBe("Projects/Notes/Captured thought.md");

    const invocation = JSON.parse(await readFile(fixture.log, "utf8")) as {
      argv: string[];
      markdown: string;
      mode: number;
    };
    expect(invocation.argv).toContain("Projects/Notes");
    expect(invocation.markdown).toBe("Private clipboard text\n");
    expect(invocation.mode & 0o777).toBe(0o600);
  });

  test("reports a note that was moved or deleted", async () => {
    const fixture = await createFixtureCli();
    const cli = fixtureClient(fixture);

    expect(cli.getNote("Missing.md")).rejects.toBeInstanceOf(YapsNoteNotFoundError);
  });

  test("surfaces CLI stderr instead of hiding the actionable failure", async () => {
    const fixture = await createFixtureCli();
    const cli = fixtureClient(fixture);
    await writeFile(join(fixture.directory, "stderr-search"), "");

    expect(cli.searchNotes("launch plan")).rejects.toThrow("vault is not available");
  });

  test("expands a configured home-relative executable path and invalidates a stale cache", async () => {
    const fixture = await createFixtureCli();
    const discoveryDirectory = await mkdtemp(join(homedir(), "yaps-raycast-discovery-"));
    temporaryDirectories.push(discoveryDirectory);
    const discoveredPath = join(discoveryDirectory, "yaps");
    await writeFile(discoveredPath, await readFile(fixture.executable), { mode: 0o700 });

    const cli = new YapsCli({
      configuredPath: join("~", basename(discoveryDirectory), "yaps"),
      supportPath: join(fixture.directory, "support"),
    });

    expect(await cli.resolveCliPath()).toBe(discoveredPath);
    await rm(discoveredPath);
    await expect(cli.resolveCliPath()).rejects.toThrow("Yaps CLI was not found");
  });

  test("validates an explicit override before enumerating installed applications", async () => {
    const fixture = await createFixtureCli();
    let enumerations = 0;
    const cli = new YapsCli({
      configuredPath: fixture.executable,
      additionalCliPaths: async () => {
        enumerations += 1;
        return ["/should/not/be/used"];
      },
      supportPath: join(fixture.directory, "support"),
    });

    expect(await cli.resolveCliPath()).toBe(fixture.executable);
    expect(enumerations).toBe(0);
  });

  test("fails closed on an invalid override without enumerating a fallback", async () => {
    const fixture = await createFixtureCli();
    let enumerations = 0;
    const cli = new YapsCli({
      configuredPath: join(fixture.directory, "missing-cli"),
      additionalCliPaths: async () => {
        enumerations += 1;
        return [fixture.executable];
      },
      supportPath: join(fixture.directory, "support"),
    });

    await expect(cli.resolveCliPath()).rejects.toThrow("Yaps CLI was not found");
    expect(enumerations).toBe(0);
  });

  test("rejects the packaged GUI executable without spawning it as a CLI", async () => {
    const fixture = await createFixtureCli();
    const guiExecutable = join(fixture.directory, "Yaps.app", "Contents", "MacOS", "yaps");
    const sentinel = join(fixture.directory, "gui-was-launched");
    await writeFile(
      guiExecutable,
      `#!/bin/sh
touch ${JSON.stringify(sentinel)}
`,
      { mode: 0o700 },
    );
    await chmod(guiExecutable, 0o700);
    const cli = new YapsCli({
      configuredPath: guiExecutable,
      supportPath: join(fixture.directory, "support"),
    });

    await expect(cli.resolveCliPath()).rejects.toThrow("Yaps CLI was not found");
    expect(await pathExists(sentinel)).toBe(false);
  });

  test("continues past a PATH wrapper to the verified app helper", async () => {
    const fixture = await createFixtureCli();
    const pathDirectory = join(fixture.directory, "wrapper-bin");
    await mkdir(pathDirectory);
    await createStandaloneStatusCli(pathDirectory, "yaps");
    await symlink(process.execPath, join(pathDirectory, "bun"));
    const previousPath = process.env.PATH;
    process.env.PATH = pathDirectory;
    try {
      const cli = new YapsCli({
        additionalCliPaths: async () => [fixture.executable],
        supportPath: join(fixture.directory, "support"),
      });
      expect(await cli.resolveCliPath()).toBe(fixture.executable);
      expect((await cli.getVaultStatus()).root).toBe(fixture.vault);
      expect(await pathExists(fixture.authLog)).toBe(true);
    } finally {
      if (previousPath === undefined) delete process.env.PATH;
      else process.env.PATH = previousPath;
    }
  });

  test("hard-stops a discovery candidate that ignores SIGTERM", async () => {
    const fixture = await createFixtureCli();
    const executable = join(fixture.directory, "ignores-term");
    await writeFile(executable, "#!/bin/sh\ntrap '' TERM\nwhile :; do :; done\n", {
      mode: 0o700,
    });
    await chmod(executable, 0o700);
    const cli = new YapsCli({
      configuredPath: executable,
      discoveryTimeoutMs: 75,
      supportPath: join(fixture.directory, "support"),
    });
    const startedAt = Date.now();

    await expect(cli.resolveCliPath()).rejects.toThrow("Yaps CLI was not found");
    expect(Date.now() - startedAt).toBeLessThan(500);
  }, 1_000);

  test("accepts a CLI path discovered from an installed Yaps app", async () => {
    const fixture = await createFixtureCli();
    const previousPath = process.env.PATH;
    process.env.PATH = dirname(process.execPath);

    try {
      const cli = new YapsCli({
        additionalCliPaths: async () => [fixture.executable],
        supportPath: join(fixture.directory, "support"),
      });

      expect(await cli.resolveCliPath()).toBe(fixture.executable);
    } finally {
      if (previousPath === undefined) delete process.env.PATH;
      else process.env.PATH = previousPath;
    }
  });

  test("bounds installed-application enumeration by the total discovery deadline", async () => {
    const fixture = await createFixtureCli();
    const cli = new YapsCli({
      additionalCliPaths: () => new Promise<string[]>(() => undefined),
      discoveryTimeoutMs: 30,
      maxDiscoveryCandidates: 0,
      supportPath: join(fixture.directory, "support"),
    });
    const startedAt = Date.now();

    await expect(cli.resolveCliPath()).rejects.toThrow("Yaps CLI was not found");
    expect(Date.now() - startedAt).toBeLessThan(500);
  });

  test("caps candidate checks before later additional paths", async () => {
    const fixture = await createFixtureCli();
    const first = join(fixture.directory, "missing-one");
    const second = join(fixture.directory, "missing-two");
    const validThird = await createStandaloneStatusCli(fixture.directory, "valid-third");
    const previousPath = process.env.PATH;
    process.env.PATH = "";
    try {
      const cli = new YapsCli({
        additionalCliPaths: async () => [first, second, validThird],
        maxDiscoveryCandidates: 2,
        supportPath: join(fixture.directory, "support"),
      });

      await expect(cli.resolveCliPath()).rejects.toThrow("Yaps CLI was not found");
    } finally {
      if (previousPath === undefined) delete process.env.PATH;
      else process.env.PATH = previousPath;
    }
  });

  test("automatically follows the desktop app's canonical settings path", async () => {
    const fixture = await createFixtureCli();
    await writeFile(join(fixture.directory, "settings-mismatch"), "");

    await fixtureClient(fixture).getVaultStatus();

    const invocation = JSON.parse(await readFile(fixture.sessionLog, "utf8")) as string[];
    expect(invocation.slice(0, 2)).toEqual([
      "--settings-path",
      join(fixture.directory, "canonical settings", "settings.json"),
    ]);
  });

  test("never runs the legacy credential-based auth check on older Yaps builds", async () => {
    const fixture = await createFixtureCli();
    await writeFile(
      join(fixture.directory, "Yaps.app", "Contents", "Info.plist"),
      plist("2.3.123"),
    );

    await expect(fixtureClient(fixture).getVaultStatus()).rejects.toThrow(
      "older credential-based account check",
    );

    expect(await pathExists(fixture.authLog)).toBe(false);
    expect(await pathExists(fixture.sessionLog)).toBe(false);
  });

  test("does not run auth when a custom binary's package version is unverifiable", async () => {
    const fixture = await createFixtureCli();
    const standalone = join(fixture.directory, "standalone-yaps-cli");
    await writeFile(standalone, await readFile(fixture.executable), { mode: 0o700 });
    const cli = new YapsCli({
      configuredPath: standalone,
      supportPath: join(fixture.directory, "support"),
    });

    await expect(cli.getVaultStatus()).rejects.toThrow(
      "could not verify that its account check is credential-free",
    );
    expect(await pathExists(fixture.authLog)).toBe(false);
    expect(await pathExists(fixture.sessionLog)).toBe(false);
  });

  test("rejects a PATH symlink canonicalizing to the Setapp package", async () => {
    const fixture = await createFixtureCli();
    await writeFile(
      join(fixture.directory, "Yaps.app", "Contents", "Info.plist"),
      plist("2.3.124", "com.yaps.app-setapp"),
    );
    const pathDirectory = join(fixture.directory, "path-bin");
    await mkdir(pathDirectory);
    await symlink(fixture.executable, join(pathDirectory, "yaps_cli"));
    const previousPath = process.env.PATH;
    process.env.PATH = [pathDirectory, dirname(process.execPath), "/usr/bin", "/bin"].join(":");
    try {
      const cli = new YapsCli({
        maxDiscoveryCandidates: 2,
        supportPath: join(fixture.directory, "support"),
      });
      await expect(cli.getVaultStatus()).rejects.toThrow(
        "could not verify that its account check is credential-free",
      );
      expect(await pathExists(fixture.authLog)).toBe(false);
    } finally {
      if (previousPath === undefined) delete process.env.PATH;
      else process.env.PATH = previousPath;
    }
  });

  test("requires an active trial or Yaps Pro before a vault command", async () => {
    const fixture = await createFixtureCli();
    await writeFile(join(fixture.directory, "expired-account"), "");
    let recoveryChecks = 0;
    const cli = new YapsCli({
      configuredPath: fixture.executable,
      recoveryApplicationPath: async () => {
        recoveryChecks += 1;
        return join(fixture.directory, "Yaps.app");
      },
      supportPath: join(fixture.directory, "support"),
    });

    await expect(cli.getVaultStatus()).rejects.toThrow("trial or Yaps Pro access is not active");
    expect(recoveryChecks).toBe(0);
    expect(await pathExists(fixture.sessionLog)).toBe(false);
  });

  test("requires the desktop account to be signed in before a vault command", async () => {
    const fixture = await createFixtureCli();
    await writeFile(join(fixture.directory, "signed-out-account"), "");
    let recoveryChecks = 0;
    const cli = new YapsCli({
      configuredPath: fixture.executable,
      recoveryApplicationPath: async () => {
        recoveryChecks += 1;
        return join(fixture.directory, "Yaps.app");
      },
      supportPath: join(fixture.directory, "support"),
    });

    await expect(cli.getVaultStatus()).rejects.toThrow("no active desktop account is signed in");
    expect(recoveryChecks).toBe(0);
    expect(await pathExists(fixture.sessionLog)).toBe(false);
  });

  test("does not wake Yaps when the account has mobile-only access", async () => {
    const fixture = await createFixtureCli();
    await writeFile(join(fixture.directory, "platform-mismatch-account"), "");
    let recoveryChecks = 0;
    const cli = new YapsCli({
      configuredPath: fixture.executable,
      recoveryApplicationPath: async () => {
        recoveryChecks += 1;
        return join(fixture.directory, "Yaps.app");
      },
      supportPath: join(fixture.directory, "support"),
    });

    await expect(cli.getVaultStatus()).rejects.toThrow("only has mobile access");
    expect(recoveryChecks).toBe(0);
    expect(await pathExists(fixture.sessionLog)).toBe(false);
  });

  test("does not wake an arbitrary adjacent app for a refreshable account cache", async () => {
    const fixture = await createFixtureCli();
    await writeFile(join(fixture.directory, "refreshable-account"), "");

    await expect(fixtureClient(fixture).getVaultStatus()).rejects.toThrow(
      "could not verify current trial or Yaps Pro access",
    );
    expect((await readFile(fixture.authLog, "utf8")).trim()).toBe("auth-status");
    expect(await pathExists(fixture.sessionLog)).toBe(false);
  });

  test("retries a refreshable cache after a verified installed-app wake", async () => {
    const fixture = await createFixtureCli();
    await writeFile(join(fixture.directory, "refreshable-account"), "");
    let launches = 0;
    const cli = new YapsCli({
      authRecoveryTimeoutMs: 1_000,
      authRetryDelaysMs: [0],
      configuredPath: fixture.executable,
      launchYapsApp: async (applicationPath) => {
        launches += 1;
        expect(applicationPath).toBe(join(fixture.directory, "Yaps.app"));
        await writeFile(join(fixture.directory, "refreshed-account"), "");
        return true;
      },
      recoveryApplicationPath: async () => join(fixture.directory, "Yaps.app"),
      supportPath: join(fixture.directory, "support"),
    });

    expect((await cli.getVaultStatus()).note_count).toBe(1);
    expect(launches).toBe(1);
    expect((await readFile(fixture.authLog, "utf8")).trim().split("\n")).toHaveLength(2);
  });

  test("allows vault commands for the signed-in active desktop account", async () => {
    const fixture = await createFixtureCli();

    const status = await fixtureClient(fixture).getVaultStatus();

    expect(status.note_count).toBe(1);
    expect((await readFile(fixture.authLog, "utf8")).trim()).toBe("auth-status");
  });

  test("turns a CLI timeout into an actionable error", async () => {
    const fixture = await createFixtureCli();
    const cli = fixtureClient(fixture, 50);
    await writeFile(join(fixture.directory, "timeout-search"), "");

    expect(cli.searchNotes("launch plan")).rejects.toThrow(
      "Yaps took too long to respond. Try again, or restart Yaps.",
    );
  }, 1_000);

  test("turns malformed CLI output into an actionable error", async () => {
    const fixture = await createFixtureCli();
    const cli = fixtureClient(fixture);
    await writeFile(join(fixture.directory, "malformed-status"), "");

    expect(cli.getVaultStatus()).rejects.toThrow(
      "Yaps CLI returned an unreadable response. Update Yaps and try again.",
    );
  });

  test("rejects valid JSON that does not match the supported CLI contract", async () => {
    const fixture = await createFixtureCli();
    const cli = fixtureClient(fixture);
    await writeFile(join(fixture.directory, "invalid-list"), "");

    expect(cli.listNotes()).rejects.toThrow(
      "Yaps CLI returned an unsupported response. Update Yaps and try again.",
    );
  });

  test("rejects malformed nested search fields instead of accepting partial results", async () => {
    const fixture = await createFixtureCli();
    const cli = fixtureClient(fixture);
    await writeFile(join(fixture.directory, "invalid-search"), "");

    expect(cli.searchNotes("launch plan")).rejects.toThrow(
      "Yaps CLI returned an unsupported response. Update Yaps and try again.",
    );
  });

  test("only resolves real files contained by the active vault", async () => {
    const fixture = await createFixtureCli();
    const cli = fixtureClient(fixture);
    const inbox = join(fixture.vault, "Inbox");
    const note = join(inbox, "Note.md");
    const outside = join(fixture.directory, "outside.md");
    await mkdir(inbox, { recursive: true });
    await writeFile(note, "Inside");
    await writeFile(outside, "Outside");
    await symlink(outside, join(inbox, "Escaped.md"));
    await mkdir(join(fixture.vault, "Exports"));
    await symlink(join(fixture.directory, "outside-folder"), join(fixture.vault, "Linked"));
    await mkdir(join(fixture.directory, "outside-folder"));
    await writeFile(join(fixture.directory, "outside-folder", "Secret.md"), "Outside");

    expect(await cli.resolveVaultFile("Inbox/Note.md")).toBe(await realpath(note));
    expect(cli.resolveVaultFile("../outside.md")).rejects.toThrow("outside the active vault");
    expect(cli.resolveVaultFile("/etc/passwd")).rejects.toThrow("outside the active vault");
    expect(cli.resolveVaultFile(".")).rejects.toThrow("outside the active vault");
    expect(cli.resolveVaultFile("Inbox/Escaped.md")).rejects.toThrow("outside the active vault");
    expect(cli.resolveVaultFile("Linked/Secret.md")).rejects.toThrow("outside the active vault");
    expect(cli.resolveVaultFile("Inbox/Missing.md")).rejects.toBeInstanceOf(YapsNoteNotFoundError);
  });

  test("accepts a note beneath a symlinked vault root after canonicalizing both paths", async () => {
    const fixture = await createFixtureCli();
    const linkedVault = join(fixture.directory, "vault-link");
    const note = join(fixture.vault, "Inbox", "Linked-root.md");
    await mkdir(join(fixture.vault, "Inbox"), { recursive: true });
    await writeFile(note, "Inside");
    await symlink(fixture.vault, linkedVault, "dir");
    await writeFile(join(fixture.directory, "symlinked-status"), "");

    expect(await fixtureClient(fixture).resolveVaultFile("Inbox/Linked-root.md")).toBe(
      await realpath(note),
    );
  });
});

interface Fixture {
  directory: string;
  executable: string;
  log: string;
  sessionLog: string;
  authLog: string;
  vault: string;
}

function fixtureClient(fixture: Fixture, timeoutMs?: number): YapsCli {
  return new YapsCli({
    configuredPath: fixture.executable,
    supportPath: join(fixture.directory, "support"),
    timeoutMs,
  });
}

async function createFixtureCli(): Promise<Fixture> {
  const directory = await mkdtemp(join(tmpdir(), "yaps-raycast-cli-test-"));
  temporaryDirectories.push(directory);
  const application = join(directory, "Yaps.app");
  const executable = join(application, "Contents", "MacOS", "yaps_cli");
  const log = join(directory, "create-invocation.json");
  const sessionLog = join(directory, "session-invocation.json");
  const authLog = join(directory, "auth-invocation.log");
  const vault = join(directory, "vault");
  await mkdir(join(application, "Contents", "MacOS"), { recursive: true });
  await writeFile(join(application, "Contents", "Info.plist"), plist("2.3.124"));
  await writeFile(
    executable,
    `#!/usr/bin/env bun
import { access, appendFile, readFile, stat, writeFile } from "node:fs/promises";

const argv = process.argv.slice(2);
const commandArgs = [...argv];
if (commandArgs[0] === "--settings-path") commandArgs.splice(0, 2);
if (commandArgs[0] === "--pretty") commandArgs.shift();
const command = commandArgs.slice(0, 2).join(" ");
const exists = async (path) => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};
const note = (id, path, updatedAt) => ({
  aliases: [],
  created_at: 1,
  id,
  kind: "text",
  markdown: "Body",
  path,
  pinned: false,
  source: "quick_capture",
  tags: [],
  title: path.split("/").at(-1).replace(/\\.md$/, ""),
  updated_at: updatedAt,
});

if (command === "status --pretty") {
  console.log(JSON.stringify({
    settings_path: "/settings",
    settings_exists: true,
    auth_store_path: "/auth",
    models_dir: "/models",
  }));
} else if (command === "auth status") {
  await appendFile(${JSON.stringify(authLog)}, "auth-status\\n");
  const mismatch = await exists(${JSON.stringify(join(directory, "settings-mismatch"))});
  const expired = await exists(${JSON.stringify(join(directory, "expired-account"))});
  const signedOut = await exists(${JSON.stringify(join(directory, "signed-out-account"))});
  const platformMismatch = await exists(${JSON.stringify(join(directory, "platform-mismatch-account"))});
  const refreshable = await exists(${JSON.stringify(join(directory, "refreshable-account"))});
  const refreshed = await exists(${JSON.stringify(join(directory, "refreshed-account"))});
  console.log(JSON.stringify(
    mismatch && !argv.includes("--settings-path")
      ? {authenticated:false,status:"settings_path_mismatch",recommended_settings_path:${JSON.stringify(join(directory, "canonical settings", "settings.json"))}}
      : expired
        ? {authenticated:true,status:"expired"}
        : signedOut
          ? {authenticated:false,status:"signed_out"}
          : platformMismatch
            ? {authenticated:true,status:"platform_mismatch"}
            : refreshable && !refreshed
              ? {authenticated:true,status:"cached_offline",diagnostic_code:"account_cache_incomplete"}
              : {authenticated:true,status:"active"}
  ));
} else if (command === "vault list") {
  if (await exists(${JSON.stringify(join(directory, "invalid-list"))})) {
    console.log(JSON.stringify({ count: 2, notes: {} }));
  } else {
    console.log(JSON.stringify({ count: 2, notes: [
      note("older", "Inbox/Older.md", 10),
      note("newer", "Inbox/Newer.md", 20),
    ] }));
  }
} else if (command === "vault search") {
  if (await exists(${JSON.stringify(join(directory, "timeout-search"))})) {
    await new Promise(() => {});
  } else if (await exists(${JSON.stringify(join(directory, "stderr-search"))})) {
    console.error("vault is not available");
    process.exit(17);
  } else if (await exists(${JSON.stringify(join(directory, "invalid-search"))})) {
    console.log(JSON.stringify({ count: 1, hits: [{
      note_id: "launch",
      path: "Projects/Launch.md",
      score: "4.2",
      snippet: "Launch plan",
      title: "Launch",
    }] }));
  } else {
    console.log(JSON.stringify({ count: 1, hits: [{
      note_id: "launch",
      path: "Projects/Launch.md",
      score: 4.2,
      snippet: "Launch plan",
      title: "Launch",
    }] }));
  }
} else if (command === "vault get") {
  console.log(JSON.stringify({
    note: commandArgs[2] === "Missing.md" ? null : note("fetched", "Inbox/Fetched.md", 30),
  }));
} else if (command === "vault create") {
  const markdownIndex = commandArgs.indexOf("--markdown-file");
  const markdownPath = commandArgs[markdownIndex + 1];
  const folder = commandArgs[commandArgs.indexOf("--folder") + 1];
  const title = commandArgs[commandArgs.indexOf("--title") + 1];
  const fileStat = await stat(markdownPath);
  await writeFile(${JSON.stringify(log)}, JSON.stringify({
    argv,
    markdown: await readFile(markdownPath, "utf8"),
    mode: fileStat.mode,
  }));
  console.log(JSON.stringify({
    changed_fields: ["create"],
    note: note("created", folder + "/" + title + ".md", 40),
  }));
} else if (command === "vault status") {
  await writeFile(${JSON.stringify(sessionLog)}, JSON.stringify(argv));
  if (await exists(${JSON.stringify(join(directory, "malformed-status"))})) {
    console.log("not-json");
  } else {
    const statusRoot = await exists(${JSON.stringify(join(directory, "symlinked-status"))})
      ? ${JSON.stringify(join(directory, "vault-link"))}
      : ${JSON.stringify(vault)};
    console.log(JSON.stringify({
      index_initialized: true,
      note_count: 1,
      root: statusRoot,
    }));
  }
} else {
  console.error("Unexpected fixture invocation: " + argv.join(" "));
  process.exit(2);
}
`,
    { mode: 0o700 },
  );
  await chmod(executable, 0o700);
  expect((await stat(executable)).mode & 0o111).not.toBe(0);
  return { directory, executable, log, sessionLog, authLog, vault };
}

function plist(version: string, bundleIdentifier = "com.yaps.app"): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<plist version="1.0"><dict>',
    `<key>CFBundleIdentifier</key><string>${bundleIdentifier}</string>`,
    `<key>CFBundleShortVersionString</key><string>${version}</string>`,
    "</dict></plist>",
  ].join("");
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function createStandaloneStatusCli(directory: string, name: string): Promise<string> {
  const executable = join(directory, name);
  await writeFile(
    executable,
    `#!/bin/sh
printf '%s\\n' '{"settings_path":"/settings","settings_exists":true,"auth_store_path":"/auth","models_dir":"/models"}'
`,
    { mode: 0o700 },
  );
  await chmod(executable, 0o700);
  return executable;
}
