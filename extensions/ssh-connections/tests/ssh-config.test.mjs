import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readConfigHosts } from "../src/ssh-config.ts";

test("reads concrete aliases and includes, skips wildcard patterns and cycles", () => {
  const dir = mkdtempSync(join(tmpdir(), "ssh-manager-"));
  try {
    mkdirSync(join(dir, "conf.d"));
    writeFileSync(
      join(dir, "config"),
      "Host alpha BETA *.example !excluded\n Include conf.d/*.conf\nHost alpha\n",
    );
    writeFileSync(
      join(dir, "conf.d", "one.conf"),
      "Host gamma # note\nInclude config\n",
    );
    assert.deepEqual(readConfigHosts(dir), ["alpha", "BETA", "gamma"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("missing config is empty", () => {
  const dir = mkdtempSync(join(tmpdir(), "ssh-manager-"));
  try {
    assert.deepEqual(readConfigHosts(dir), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

import {
  getConfigFields,
  saveConfigFields,
  deleteConfigHost,
} from "../src/ssh-config.ts";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
test("create, edit and delete preserve unrelated SSH config and options", () => {
  const dir = mkdtempSync(join(tmpdir(), "ssh-manager-"));
  try {
    const file = join(dir, "config");
    writeFileSync(
      file,
      "# existing\nCompression yes\nHost *\n  ServerAliveInterval 45\n",
    );
    const fields = {
      alias: "box",
      host: "example.test",
      user: "alice",
      port: "2222",
      identityFile: "~/.ssh/key with spaces",
    };
    saveConfigFields(fields, undefined, dir);
    assert.deepEqual(getConfigFields("box", dir), fields);
    const effective = execFileSync("/usr/bin/ssh", ["-G", "-F", file, "box"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    assert.match(effective, /hostname example\.test/);
    assert.match(effective, /port 2222/);
    assert.match(effective, /serveraliveinterval 45/);
    assert.match(effective, /compression yes/);
    assert.throws(
      () => saveConfigFields(fields, undefined, dir),
      /already exists/,
    );
    let text = readFileSync(file, "utf8").replace(
      "  User",
      "  ProxyJump jump\n  User",
    );
    writeFileSync(file, text);
    saveConfigFields({ ...fields, host: "new.example", port: "" }, "box", dir);
    text = readFileSync(file, "utf8");
    assert.match(text, /ProxyJump jump/);
    assert.match(text, /Host \*\n  ServerAliveInterval 45/);
    assert.equal(getConfigFields("box", dir).port, "");
    deleteConfigHost("box", dir);
    assert.equal(
      readFileSync(file, "utf8"),
      "# existing\nCompression yes\nHost *\n  ServerAliveInterval 45\n",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("refuses to change shared or ambiguous Host blocks", () => {
  const dir = mkdtempSync(join(tmpdir(), "ssh-manager-"));
  try {
    const file = join(dir, "config");
    const shared = "Host alpha beta\n  User user\n";
    writeFileSync(file, shared);
    assert.throws(() => getConfigFields("alpha", dir), /multiple patterns/);
    assert.throws(() => deleteConfigHost("alpha", dir), /multiple patterns/);
    assert.equal(readFileSync(file, "utf8"), shared);
    writeFileSync(file, "Host alpha\n  User one\nHost alpha\n  User two\n");
    assert.throws(() => deleteConfigHost("alpha", dir), /multiple Host blocks/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("create and delete retain blank lines and comments exactly", () => {
  const dir = mkdtempSync(join(tmpdir(), "ssh-manager-"));
  try {
    const path = join(dir, "config");
    const original =
      "# top\n\nHost existing\n  User alice\n\n# other block\nHost other\n  User bob\n";
    writeFileSync(path, original);
    saveConfigFields(
      {
        alias: "test",
        host: "localhost",
        user: "",
        port: "",
        identityFile: "",
      },
      undefined,
      dir,
    );
    deleteConfigHost("test", dir);
    assert.equal(readFileSync(path, "utf8"), original);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("display reads shared aliases and conditional host candidates without executing Match commands", async () => {
  const { getConfigDisplay } = await import("../src/ssh-config.ts");
  const dir = mkdtempSync(join(tmpdir(), "ssh-manager-"));
  try {
    const marker = join(dir, "executed");
    writeFileSync(
      join(dir, "config"),
      `Match host Nano,nano !exec "touch ${marker}"\n  HostName tunnel.example\nHost Nano nano\n  User root\n  HostName 192.0.2.1\nHost other\n  User someone\n`,
    );
    assert.deepEqual(getConfigDisplay("Nano", dir), {
      host: "192.0.2.1",
      user: "root",
      port: "",
      identityFile: "",
      conditionalHosts: ["tunnel.example"],
      conditional: true,
    });
    assert.deepEqual(getConfigDisplay("other", dir).conditionalHosts, []);
    assert.throws(() => readFileSync(marker), { code: "ENOENT" });
    assert.equal(getConfigFields("Nano", dir).user, "root");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("icons and advanced options preserve existing config and shared blocks", async () => {
  const {
    getPresentation,
    setHostEmoji,
    getAdvancedOptions,
    saveAdvancedOptions,
  } = await import("../src/ssh-config.ts");
  const dir = mkdtempSync(join(tmpdir(), "ssh-manager-"));
  try {
    const file = join(dir, "config");
    const original =
      "Host dev\n  HostName example.test\n  ForwardAgent yes\n  ServerAliveInterval 10 # keep this\n  CustomOption value\n  #SCEIcon dev\n  #SCETags Green\n\nHost Nano nano\n  User root\n  #SCEIcon solaris\n";
    writeFileSync(file, original);
    assert.equal(getPresentation("dev", dir).emoji, "🛠️");
    assert.deepEqual(getPresentation("dev", dir).tags, ["Green"]);
    setHostEmoji("Nano", "🐟", dir);
    assert.equal(getPresentation("nano", dir).emoji, "🐟");
    setHostEmoji("Nano", "", dir);
    assert.equal(readFileSync(file, "utf8"), original);
    assert.throws(() => setHostEmoji("dev", "bad", dir), /one emoji/);
    const before = getAdvancedOptions("dev", dir);
    saveAdvancedOptions(
      "dev",
      {
        ...before,
        ForwardAgent: "no",
        ProxyJump: "bastion",
        RemoteCommand: "/bin/zsh -l",
      },
      before,
      dir,
    );
    const text = readFileSync(file, "utf8");
    assert.match(text, /ForwardAgent no/);
    assert.match(text, /ProxyJump bastion/);
    assert.match(text, /ServerAliveInterval 10 # keep this/);
    assert.match(text, /CustomOption value/);
    assert.match(text, /#SCEIcon dev/);
    assert.throws(
      () => saveAdvancedOptions("dev", before, before, dir),
      /changed/,
    );
    assert.equal(getAdvancedOptions("Nano", dir).ForwardAgent, "");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("case variants can be edited while preserving the shared Host header and Match", () => {
  const dir = mkdtempSync(join(tmpdir(), "ssh-manager-"));
  try {
    const file = join(dir, "config");
    const input =
      'Match host Nano,nano !exec "true"\n  HostName tunnel.example\nHost Nano nano # both spellings\n  User root # keep\n  HostName 192.0.2.1\n  ForwardAgent yes\n';
    writeFileSync(file, input);
    const initial = getConfigFields("Nano", dir);
    saveConfigFields(initial, "Nano", dir);
    assert.equal(readFileSync(file, "utf8"), input);
    saveConfigFields({ ...initial, host: "192.0.2.2" }, "Nano", dir);
    const after = readFileSync(file, "utf8");
    assert.match(after, /Host Nano nano # both spellings/);
    assert.match(after, /User root # keep/);
    assert.match(after, /Match host Nano,nano !exec/);
    assert.throws(
      () => saveConfigFields({ ...initial, alias: "new" }, "Nano", dir),
      /Rename it manually/,
    );
    assert.throws(() => deleteConfigHost("Nano", dir), /Delete it manually/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("quoted identity path with hash and escaped characters round trips", () => {
  const dir = mkdtempSync(join(tmpdir(), "ssh-manager-"));
  try {
    const fields = {
      alias: "quoted",
      host: "example.test",
      user: "",
      port: "",
      identityFile: '/tmp/key # "name" \\ path',
    };
    saveConfigFields(fields, undefined, dir);
    assert.deepEqual(getConfigFields("quoted", dir), fields);
    const output = execFileSync(
      "/usr/bin/ssh",
      ["-G", "-F", join(dir, "config"), "quoted"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
    assert.ok(output.includes(`identityfile ${fields.identityFile}\n`));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("changes to files ending in a Host header remain valid", async () => {
  const {
    getAdvancedOptions,
    saveAdvancedOptions,
    setHostEmoji,
    getPresentation,
  } = await import("../src/ssh-config.ts");
  const dir = mkdtempSync(join(tmpdir(), "ssh-manager-"));
  try {
    const path = join(dir, "config");
    writeFileSync(path, "Host one");
    const fields = getConfigFields("one", dir);
    saveConfigFields({ ...fields, host: "example.test" }, "one", dir);
    assert.equal(getConfigFields("one", dir).host, "example.test");
    writeFileSync(path, "Host one");
    const options = getAdvancedOptions("one", dir);
    saveAdvancedOptions(
      "one",
      { ...options, ForwardAgent: "yes" },
      options,
      dir,
    );
    assert.equal(getAdvancedOptions("one", dir).ForwardAgent, "yes");
    writeFileSync(path, "Host one");
    setHostEmoji("one", "🐟", dir);
    assert.equal(getPresentation("one", dir).emoji, "🐟");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("protects conditional aliases and rejects SSH destination syntax in aliases", () => {
  const dir = mkdtempSync(join(tmpdir(), "ssh-manager-"));
  try {
    const path = join(dir, "config");
    const config =
      'Match host one exec "true"\n  HostName test\nHost one\n  User root\n';
    writeFileSync(path, config);
    const current = getConfigFields("one", dir);
    assert.throws(
      () => saveConfigFields({ ...current, alias: "renamed" }, "one", dir),
      /Match rules/,
    );
    assert.throws(() => deleteConfigHost("one", dir), /Match rules/);
    assert.equal(readFileSync(path, "utf8"), config);
    for (const alias of ["user@host", "host:22", "a=b", "[::1]"])
      assert.throws(
        () => saveConfigFields({ ...current, alias }, undefined, dir),
        /single SSH alias/,
      );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("never replaces a dangling SSH config symlink", async () => {
  const { symlinkSync, readlinkSync } = await import("node:fs");
  const dir = mkdtempSync(join(tmpdir(), "ssh-manager-"));
  try {
    const path = join(dir, "config");
    symlinkSync(join(dir, "missing"), path);
    assert.throws(
      () =>
        saveConfigFields(
          { alias: "test", host: "host", user: "", port: "", identityFile: "" },
          undefined,
          dir,
        ),
      /dangling symlink/,
    );
    assert.equal(readlinkSync(path), join(dir, "missing"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
