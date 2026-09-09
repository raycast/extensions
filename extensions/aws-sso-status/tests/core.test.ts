import { StatusCoordinator } from "../src/aws/coordinator";
import { MetadataStore } from "../src/aws/store";
import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm, chmod } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { configPath, parseAwsConfig, readAwsConfig } from "../src/aws/config";
import { consoleUrl, discoverProfiles, filterProfiles, isSsoProfile, selectPrimary } from "../src/aws/profiles";
import { getStatusFromExpiration, parseExpiration, resolveStatus } from "../src/aws/status";
import { CliError, classifyCliError, cliEnvironment, findAwsCli, runAws } from "../src/aws/cli";
import { formatRemainingTime, menuBarTitle } from "../src/formatting";
const modern = `[profile dev-test_one]\nsso_session = example\nsso_account_id = 123456789012\nsso_role_name = DeveloperAccess\nregion = ap-northeast-1\n[sso-session example]\nsso_start_url = https://example.awsapps.com/start\nsso_region = us-east-1\n`;
const legacy = `[default]\nsso_start_url = https://example.awsapps.com/start\nsso_region = us-east-1\nsso_account_id = 123456789012\nsso_role_name = DeveloperAccess\n`;
const profile = discoverProfiles(parseAwsConfig(modern))[0];
const settings = { threshold: "30", menuBarStyle: "remaining" };
test("modern session, dash and underscore names", () => {
  assert.equal(profile.name, "dev-test_one");
  assert.equal(profile.sessionName, "example");
  assert.equal(profile.ssoRegion, "us-east-1");
  assert.deepEqual(profile.issues, []);
});
test("legacy default and multiple profiles", () => {
  const profiles = discoverProfiles(parseAwsConfig(modern + legacy));
  assert.equal(profiles.length, 2);
  assert.deepEqual(profiles[0].issues, []);
  assert.equal(selectPrimary(profiles.map((profile) => ({ profile })))?.profile.name, "default");
  assert.equal(filterProfiles(profiles, " dev-test_one,missing ").length, 1);
  assert.equal(
    selectPrimary(
      profiles.map((profile) => ({ profile })),
      "missing",
    ),
    undefined,
  );
});
test("static profiles are excluded and secret values are not retained", () => {
  const parsed = parseAwsConfig(
    "[profile static]\naws_access_key_id = FAKE_TEST_ONLY\naws_secret_access_key = FAKE_SECRET_ONLY",
  );
  assert.equal(isSsoProfile(parsed.get("profile static")!), false);
  assert.deepEqual(discoverProfiles(parsed), []);
  assert.equal(parsed.get("profile static")!.aws_secret_access_key, "present");
});
test("invalid AWS config and missing session", () => {
  for (const text of ["broken", "[profile dev", "[default]\nregion=x\nregion=y", "[default]\n[default]"])
    assert.throws(() => parseAwsConfig(text), /invalid/);
  assert.ok(discoverProfiles(parseAwsConfig("[profile dev]\nsso_session=missing"))[0].issues.length);
});
test("nested AWS settings do not leak into profile fields", () => {
  const parsed = parseAwsConfig(modern + "[profile plain]\ns3 =\n  region = nested\nregion = real\n");
  assert.equal(parsed.get("profile plain")!.region, "real");
});
test("mixed credential providers rejected", () => {
  assert.ok(
    discoverProfiles(
      parseAwsConfig(modern.replace("sso_session = example", "sso_session = example\ncredential_process = do-not-run")),
    )[0].issues.length,
  );
});
const now = Date.parse("2026-01-01T00:00:00Z");
for (const [minutes, expected] of [
  [-1, "Expired"],
  [0, "Expired"],
  [0.5, "< 1m"],
  [15, "15m"],
  [59, "59m"],
  [150, "2h 30m"],
] as const) {
  test(`remaining ${minutes} minutes`, () =>
    assert.equal(formatRemainingTime(new Date(now + minutes * 60000).toISOString(), now), expected));
}
test("expiration statuses and invalid values", () => {
  assert.equal(getStatusFromExpiration(new Date(now - 1).toISOString(), 30, now), "Expired");
  assert.equal(getStatusFromExpiration(new Date(now + 15 * 60000).toISOString(), 30, now), "Expiring Soon");
  assert.equal(getStatusFromExpiration(new Date(now + 59 * 60000).toISOString(), 30, now), "Signed In");
  assert.equal(getStatusFromExpiration("invalid"), "Unknown");
  assert.equal(formatRemainingTime("invalid"), "Unknown");
  assert.equal(parseExpiration('{"Expiration":"invalid"}'), undefined);
  assert.equal(parseExpiration("bad-json"), undefined);
  assert.equal(
    parseExpiration(
      '{"AccessKeyId":"FAKE","SecretAccessKey":"FAKE","SessionToken":"FAKE","Expiration":"2026-01-01T00:00:00Z"}',
    ),
    "2026-01-01T00:00:00.000Z",
  );
});
test("menu shows only time or check/cross, without a profile prefix", () => {
  const item = { profile, status: "Signed In" as const, expiration: new Date(now + 150 * 60000).toISOString() };
  assert.equal(menuBarTitle(item, settings, false, now), "2h 30m");
  assert.equal(menuBarTitle(item, { ...settings, menuBarStyle: "status" }, false, now), "✓");
  assert.equal(
    menuBarTitle({ ...item, status: "Expiring Soon" }, { ...settings, menuBarStyle: "status" }, false, now),
    "✓",
  );
  assert.equal(menuBarTitle({ ...item, expiration: new Date(now).toISOString() }, settings, false, now), "✕");
  assert.equal(menuBarTitle(undefined, settings, true), "…");
  assert.equal(menuBarTitle(undefined, settings, false), "✕");
  for (const status of ["Expired", "Not Signed In", "Invalid Configuration", "AWS CLI Not Found", "Unknown"] as const) {
    for (const menuBarStyle of ["remaining", "status"])
      assert.equal(menuBarTitle({ ...item, status }, { ...settings, menuBarStyle }, false, now), "✕");
  }
  assert.equal(menuBarTitle({ ...item, status: "Checking" }, settings, false, now), "…");
  assert.equal(menuBarTitle({ ...item, expiration: "invalid" }, settings, false, now), "✕");
});
test("portal URL is restricted to HTTPS AWS access portals", () => {
  assert.equal(consoleUrl(profile), "https://example.awsapps.com/start");
  for (const startUrl of [
    "javascript:alert(1)",
    "https://evil.example/start",
    "https://example.awsapps.com/start?token=FAKE",
    "https://user@example.awsapps.com/start",
  ])
    assert.equal(consoleUrl({ ...profile, startUrl }), undefined);
});
test("CLI error classification is sanitized", () => {
  assert.equal(classifyCliError("Error loading SSO Token: Token does not exist"), "login-required");
  assert.equal(
    classifyCliError("The SSO session associated with this profile has expired or is otherwise invalid"),
    "login-required",
  );
  assert.equal(classifyCliError("network error FAKE_SECRET"), "failed");
  assert.equal(classifyCliError("UnauthorizedException: Access to this role is denied"), "failed");
  assert.equal(classifyCliError("UnauthorizedException: Session token not found or invalid"), "login-required");
  assert.equal(cliEnvironment().AWS_SHARED_CREDENTIALS_FILE, "/dev/null");
});
test("missing config and config mtime cache invalidation", async () => {
  const dir = await mkdtemp(join(tmpdir(), "sso-test-"));
  try {
    const path = join(dir, "config");
    assert.equal((await readAwsConfig(path)).size, 0);
    await writeFile(path, modern);
    const a = await readAwsConfig(path);
    assert.equal(await readAwsConfig(path), a);
    await writeFile(path, modern + legacy);
    assert.equal((await readAwsConfig(path)).size, 3);
    assert.equal(configPath({ AWS_CONFIG_FILE: path }), path);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test("fake CLI: missing, timeout, argument safety, successful resolution, login required, generic failure", async () => {
  const dir = await mkdtemp(join(tmpdir(), "sso-cli-test-"));
  try {
    const file = join(dir, "aws");
    const fake = async (body: string) => {
      await writeFile(file, `#!${process.execPath}\n${body}\n`);
      await chmod(file, 0o700);
    };
    assert.equal(await findAwsCli(join(dir, "missing")), undefined);
    await assert.rejects(
      runAws(join(dir, "missing"), []),
      (error: unknown) => error instanceof CliError && error.kind === "missing",
    );
    await fake("setTimeout(()=>{}, 10000)");
    await assert.rejects(
      runAws(file, [], { timeoutMs: 40 }),
      (error: unknown) => error instanceof CliError && error.kind === "timeout",
    );
    await fake("process.stdout.write(JSON.stringify(process.argv.slice(2)))");
    const name = 'dev; $(touch /tmp/never-run) " --debug';
    assert.deepEqual(JSON.parse(await runAws(file, ["sso", "login", "--profile", name])), [
      "sso",
      "login",
      "--profile",
      name,
    ]);
    assert.equal(await findAwsCli(file), file);
    await fake(
      'process.stdout.write(JSON.stringify({Expiration:new Date(Date.now()+3600000).toISOString(),AccessKeyId:"FAKE_TEST_ONLY",SecretAccessKey:"FAKE_TEST_ONLY"}))',
    );
    const result = await resolveStatus(profile, file);
    assert.equal(result.status, "Signed In");
    assert.ok(!JSON.stringify(result).includes("FAKE_TEST_ONLY"));
    await fake('process.stderr.write("Error loading SSO Token: Token does not exist FAKE_TEST_ONLY"); process.exit(1)');
    const signedOut = await resolveStatus(profile, file);
    assert.equal(signedOut.status, "Not Signed In");
    assert.ok(!JSON.stringify(signedOut).includes("FAKE_TEST_ONLY"));
    await fake('process.stderr.write("network failed FAKE_TEST_ONLY"); process.exit(1)');
    assert.equal((await resolveStatus(profile, file)).status, "Unknown");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test("snapshot empty, invalid config, and AWS CLI missing", async () => {
  const dir = await mkdtemp(join(tmpdir(), "sso-snapshot-"));
  const old = process.env.AWS_CONFIG_FILE;
  try {
    const loadSnapshot = (settings: Parameters<StatusCoordinator["refresh"]>[0]) =>
      new StatusCoordinator(new MetadataStore(join(dir, "metadata"))).refresh(settings);
    process.env.AWS_CONFIG_FILE = join(dir, "config");
    assert.equal((await loadSnapshot(settings)).profiles.length, 0);
    await writeFile(process.env.AWS_CONFIG_FILE, "invalid");
    assert.equal((await loadSnapshot(settings)).error, "Invalid Configuration");
    await writeFile(process.env.AWS_CONFIG_FILE, modern);
    assert.equal(
      (await loadSnapshot({ ...settings, awsCliPath: join(dir, "missing") })).profiles[0].status,
      "AWS CLI Not Found",
    );
  } finally {
    if (old === undefined) delete process.env.AWS_CONFIG_FILE;
    else process.env.AWS_CONFIG_FILE = old;
    await rm(dir, { recursive: true, force: true });
  }
});
