import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseAwsConfig } from "../src/aws/config";
import { CliError } from "../src/aws/cli";
import { loginProfile, selectLoginProfile } from "../src/aws/login";
import { githubRepositoryUrl } from "../src/project";
const settings = { threshold: "30", menuBarStyle: "remaining" };
const config = parseAwsConfig(
  `[profile dev]\nsso_session=example\nsso_account_id=123456789012\nsso_role_name=DeveloperAccess\n[profile production]\nsso_session=example\nsso_account_id=123456789012\nsso_role_name=DeveloperAccess\n[sso-session example]\nsso_start_url=https://example.awsapps.com/start\nsso_region=us-east-1\n`,
);
test("quick sign-in respects explicit, primary, automatic, and filtered profile selection", () => {
  assert.equal(selectLoginProfile(config, settings).name, "dev");
  assert.equal(selectLoginProfile(config, { ...settings, primaryProfile: "production" }).name, "production");
  assert.equal(selectLoginProfile(config, { ...settings, primaryProfile: "production" }, "dev").name, "dev");
  assert.throws(() => selectLoginProfile(config, { ...settings, profileFilter: "dev" }, "production"));
  assert.throws(() => selectLoginProfile(config, settings, "unknown"));
  assert.throws(() => selectLoginProfile(new Map(), settings));
  assert.throws(() => selectLoginProfile(parseAwsConfig("[profile dev]\nsso_session=missing"), settings), CliError);
});
test("quick sign-in executes argument array, discards login output, then resolves credentials", async () => {
  const dir = await mkdtemp(join(tmpdir(), "sso-login-test-"));
  try {
    const file = join(dir, "aws");
    const argsFile = join(dir, "args.json");
    await writeFile(
      file,
      `#!${process.execPath}\nconst fs = require('node:fs');\nconst args = process.argv.slice(2);\nif(args[0] === '--version') process.stdout.write('aws-cli/2.99.0');\nelse if(args[0] === 'sso') { fs.writeFileSync(${JSON.stringify(argsFile)},JSON.stringify(args)); process.stdout.write('FAKE_LOGIN_OUTPUT'); }\nelse process.stdout.write(JSON.stringify({Expiration:new Date(Date.now()+3600000).toISOString(),SecretAccessKey:'FAKE_SECRET_ONLY'}));\n`,
      { mode: 0o700 },
    );
    const name = 'dev; $(not-a-command) "';
    const result = await loginProfile(
      { ...selectLoginProfile(config, settings), name },
      { ...settings, awsCliPath: file },
    );
    assert.deepEqual(JSON.parse(await readFile(argsFile, "utf8")), ["sso", "login", "--profile", name]);
    assert.equal(result.status, "Signed In");
    assert.ok(!JSON.stringify(result).includes("FAKE_"));
    await writeFile(
      file,
      `#!${process.execPath}\nif(process.argv[2] === '--version') process.stdout.write('aws-cli/2.99.0'); else {process.stderr.write('FAKE_SECRET_ONLY');process.exit(1);}`,
    );
    await assert.rejects(
      loginProfile(selectLoginProfile(config, settings), { ...settings, awsCliPath: file }),
      (error: unknown) => error instanceof CliError && !error.message.includes("FAKE_"),
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test("GitHub entry accepts only a clean repository URL", () => {
  assert.equal(githubRepositoryUrl("https://github.com/example/project"), "https://github.com/example/project");
  for (const value of [
    "",
    "javascript:alert(1)",
    "https://github.com.evil.example/a/b",
    "https://github.com/a/b?token=FAKE",
    "https://user@github.com/a/b",
    "https://github.com/a",
  ])
    assert.equal(githubRepositoryUrl(value), undefined);
});
