const assert = require("node:assert/strict");
const { execFileSync, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { after, test } = require("node:test");

const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "ghq-raycast-test-"));
after(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

execFileSync(process.execPath, [
  require.resolve("typescript/bin/tsc"),
  "--ignoreConfig",
  path.join(__dirname, "../src/ghq/command.ts"),
  "--outDir",
  temporaryDirectory,
  "--module",
  "node16",
  "--target",
  "es2022",
  "--strict",
  "--esModuleInterop",
  "--skipLibCheck",
  "--types",
  "node",
]);
const { expandHomePath, validateRepository, getRepository } = require(path.join(temporaryDirectory, "command.js"));

const fakeGHQ = path.join(temporaryDirectory, "fake ghq");
fs.writeFileSync(
  fakeGHQ,
  `#!${process.execPath}
if (process.argv.at(-1) === "missing/repository") {
  console.error("repository not found");
  process.exit(1);
}
console.log(JSON.stringify({ args: process.argv.slice(2), root: process.env.GHQ_ROOT, prompt: process.env.GIT_TERMINAL_PROMPT, path: process.env.PATH }));
`,
  { mode: 0o755 },
);

test("expands home paths and preserves spaces and other tilde prefixes", () => {
  assert.equal(expandHomePath(" ~/ghq/my projects "), path.join(os.homedir(), "ghq/my projects"));
  assert.equal(expandHomePath("~"), os.homedir());
  assert.equal(expandHomePath("/tmp/my projects"), "/tmp/my projects");
  assert.equal(expandHomePath("~another-user/ghq"), "~another-user/ghq");
});

test("rejects empty, option-like, and multiline input before executing", async () => {
  for (const repository of ["", "  ", "--update", "-p", "owner/repo\nother/repo", "owner/\0repo"]) {
    assert.ok(validateRepository(repository));
    await assert.rejects(getRepository(repository, { rootPath: "/tmp", ghqPath: fakeGHQ }));
  }
  for (const repository of ["owner/repo", "https://github.com/owner/repo", "git@github.com:owner/repo.git"]) {
    assert.equal(validateRepository(repository), undefined);
  }
});

test("passes options, the configured root, and literal repository input without a shell", async () => {
  const repository = "owner/repo; $(touch unexpected-file)";
  const { stdout } = await getRepository(` ${repository} `, {
    rootPath: "~/ghq/my projects",
    ghqPath: fakeGHQ,
    ssh: true,
    shallow: true,
    update: true,
  });
  const result = JSON.parse(stdout);
  assert.deepEqual(result.args, ["get", "--update", "-p", "--shallow", "--", repository]);
  assert.equal(result.root, path.join(os.homedir(), "ghq/my projects"));
  assert.equal(result.prompt, "0");
  assert.ok(result.path.split(path.delimiter).includes("/opt/homebrew/bin"));
  assert.ok(result.path.split(path.delimiter).includes("/usr/local/bin"));
});

test("surfaces clone errors and explains missing executables or invalid roots", async () => {
  await assert.rejects(
    getRepository("missing/repository", { rootPath: "/tmp", ghqPath: fakeGHQ }),
    /repository not found/,
  );
  await assert.rejects(
    getRepository("owner/repo", { rootPath: "/tmp", ghqPath: `${fakeGHQ}-missing` }),
    /ghq was not found/,
  );
  await assert.rejects(getRepository("owner/repo", { rootPath: "relative/root", ghqPath: fakeGHQ }), /absolute path/);
});

const realGHQ = [process.env.GHQ_TEST_BINARY, "ghq", "/opt/homebrew/bin/ghq", "/usr/local/bin/ghq"]
  .filter(Boolean)
  .find((candidate) => spawnSync(candidate, ["--version"]).status === 0);

test("real ghq clones, handles existing clones, and updates using a local Git remote", { skip: !realGHQ }, async () => {
  const source = path.join(temporaryDirectory, "source");
  const remote = path.join(temporaryDirectory, "remotes", "fixture.git");
  const root = path.join(temporaryDirectory, "clone root");
  const config = path.join(temporaryDirectory, "gitconfig");
  const git = (args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  fs.mkdirSync(source);
  git(["init", "--initial-branch=main", source]);
  git(["-C", source, "config", "user.email", "test@example.com"]);
  git(["-C", source, "config", "user.name", "Test"]);
  fs.writeFileSync(path.join(source, "README.md"), "first\n");
  git(["-C", source, "add", "."]);
  git(["-C", source, "commit", "-m", "Initial fixture"]);
  fs.mkdirSync(path.dirname(remote));
  git(["clone", "--bare", source, remote]);
  fs.writeFileSync(
    config,
    `[url "file://${path.dirname(remote)}/"]\n  insteadOf = https://github.com/ghq-raycast-test/\n`,
  );
  const previous = {
    GIT_CONFIG_GLOBAL: process.env.GIT_CONFIG_GLOBAL,
    GIT_ALLOW_PROTOCOL: process.env.GIT_ALLOW_PROTOCOL,
  };
  process.env.GIT_CONFIG_GLOBAL = config;
  process.env.GIT_ALLOW_PROTOCOL = "file";
  try {
    const repository = "https://github.com/ghq-raycast-test/fixture";
    const options = { rootPath: root, ghqPath: realGHQ, shallow: true };
    await getRepository(repository, options);
    const clone = path.join(root, "github.com/ghq-raycast-test/fixture");
    assert.equal(fs.readFileSync(path.join(clone, "README.md"), "utf8"), "first\n");
    assert.equal(git(["-C", clone, "rev-parse", "--is-shallow-repository"]), "true");
    await getRepository(repository, options);
    fs.writeFileSync(path.join(source, "README.md"), "second\n");
    git(["-C", source, "commit", "-am", "Update fixture"]);
    git(["-C", source, "push", remote, "main"]);
    await getRepository(repository, { ...options, update: true });
    assert.equal(git(["-C", clone, "rev-parse", "refs/remotes/origin/main"]), git(["-C", source, "rev-parse", "HEAD"]));
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
