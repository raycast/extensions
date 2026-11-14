import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, readFile, readdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { setTimeout as delay } from "node:timers/promises";
import { StatusCoordinator, retryDelay, recordResult, fromMetadata, scopeFor } from "../src/aws/coordinator";
import { MetadataStore, OperationBusyError, profileKey, sessionKey } from "../src/aws/store";
import { parseAwsConfig } from "../src/aws/config";
import { discoverProfiles } from "../src/aws/profiles";
import { ProfileStatus, SsoProfile } from "../src/aws/types";
import { loginProfile } from "../src/aws/login";

const fixture = `[profile dev]\nsso_session=example\nsso_account_id=123456789012\nsso_role_name=Developer\n[profile production]\nsso_session=example\nsso_account_id=123456789012\nsso_role_name=ReadOnly\n[sso-session example]\nsso_start_url=https://example.awsapps.com/start\nsso_region=us-east-1\n`;
const profiles = discoverProfiles(parseAwsConfig(fixture));
const settings: Preferences = { threshold: "30", menuBarStyle: "remaining", notifyOnSignOut: false };
function success(profile: SsoProfile): ProfileStatus {
  return {
    profile,
    status: "Signed In",
    checkedAt: new Date().toISOString(),
    expiration: new Date(Date.now() + 3600000).toISOString(),
  };
}
async function context(run: (dir: string, store: MetadataStore) => Promise<void>) {
  const dir = await mkdtemp(join(tmpdir(), "sso-coordinator-test-"));
  const previous = process.env.AWS_CONFIG_FILE;
  try {
    process.env.AWS_CONFIG_FILE = join(dir, "config");
    await writeFile(process.env.AWS_CONFIG_FILE, fixture);
    await run(dir, new MetadataStore(join(dir, "metadata")));
  } finally {
    if (previous === undefined) delete process.env.AWS_CONFIG_FILE;
    else process.env.AWS_CONFIG_FILE = previous;
    await rm(dir, { recursive: true, force: true });
  }
}
test("concurrent commands share role checks and serialize a shared SSO session", () =>
  context(async (dir, store) => {
    let calls = 0,
      active = 0,
      peak = 0,
      versions = 0;
    const dependencies = {
      findCli: async () => {
        versions++;
        return "fake";
      },
      resolve: async (profile: SsoProfile) => {
        calls++;
        active++;
        peak = Math.max(peak, active);
        await delay(30);
        active--;
        return success(profile);
      },
    };
    const first = new StatusCoordinator(store, dependencies),
      second = new StatusCoordinator(new MetadataStore(join(dir, "metadata")), dependencies);
    const [a, b] = await Promise.all([first.refresh(settings), second.refresh(settings)]);
    assert.equal(calls, 2);
    assert.equal(peak, 1);
    assert.equal(versions, 1);
    assert.equal(a.profiles.length, 2);
    assert.ok(b.profiles.every((item) => item.status === "Signed In"));
    await second.refresh(settings);
    assert.equal(calls, 2);
    assert.equal(versions, 1);
    assert.equal(sessionKey(profiles[0], scopeFor(settings)), sessionKey(profiles[1], scopeFor(settings)));
    assert.notEqual(profileKey(profiles[0], scopeFor(settings)), profileKey(profiles[1], scopeFor(settings)));
  }));
test("network failures back off once per session, manual refresh bypasses backoff", () =>
  context(async (_dir, store) => {
    let calls = 0;
    const service = new StatusCoordinator(store, {
      findCli: async () => "fake",
      resolve: async (profile) => {
        calls++;
        return { profile, status: "Unknown", failureKind: "network", checkedAt: new Date().toISOString() };
      },
    });
    const first = await service.refresh(settings);
    assert.equal(calls, 1);
    assert.ok(first.profiles.every((item) => item.status === "Unknown"));
    await service.refresh(settings);
    assert.equal(calls, 1);
    await delay(5);
    await service.refresh(settings, { force: true });
    assert.equal(calls, 2);
    const session = await store.readSession(sessionKey(profiles[0], scopeFor(settings)));
    assert.equal(session.failures, 2);
    assert.ok(session.nextRetryAt - Date.now() > 110000);
    assert.deepEqual([1, 2, 3, 4, 5, 20].map(retryDelay), [60000, 120000, 240000, 480000, 900000, 900000]);
  }));
test("sign-out reminders fire once per recovered session and rearm after success", () =>
  context(async (_dir, store) => {
    let signedOut = false,
      notifications = 0;
    const service = new StatusCoordinator(store, {
      findCli: async () => "fake",
      resolve: async (profile) =>
        signedOut
          ? { profile, status: "Not Signed In", failureKind: "login-required", checkedAt: new Date().toISOString() }
          : success(profile),
    });
    const options = {
      force: true,
      onSignOut: async () => {
        notifications++;
      },
    };
    await service.refresh({ ...settings, notifyOnSignOut: true }, options);
    signedOut = true;
    await delay(5);
    await service.refresh({ ...settings, notifyOnSignOut: true }, options);
    assert.equal(notifications, 1);
    await delay(5);
    await service.refresh({ ...settings, notifyOnSignOut: true }, options);
    assert.equal(notifications, 1);
    signedOut = false;
    await delay(5);
    await service.refresh({ ...settings, notifyOnSignOut: true }, options);
    signedOut = true;
    await delay(5);
    await service.refresh({ ...settings, notifyOnSignOut: true }, options);
    assert.equal(notifications, 2);
  }));
test("initial signed-out discovery and disabled reminders stay quiet", () =>
  context(async (_dir, store) => {
    let signedOut = true,
      notifications = 0;
    const service = new StatusCoordinator(store, {
      findCli: async () => "fake",
      resolve: async (profile) =>
        signedOut
          ? { profile, status: "Not Signed In", failureKind: "login-required", checkedAt: new Date().toISOString() }
          : success(profile),
    });
    const onSignOut = async () => {
      notifications++;
    };
    await service.refresh({ ...settings, notifyOnSignOut: true }, { onSignOut });
    assert.equal(notifications, 0);
    signedOut = false;
    await delay(5);
    await service.refresh(settings, { force: true, onSignOut });
    signedOut = true;
    await delay(5);
    await service.refresh(settings, { force: true, onSignOut });
    assert.equal(notifications, 0);
  }));
test("historical TTL and successful check survive failures, stale success is marked", () => {
  const good = recordResult(success(profiles[0]));
  const failure = recordResult(
    { profile: profiles[0], status: "Unknown", failureKind: "network", checkedAt: new Date().toISOString() },
    good,
  );
  const item = fromMetadata(profiles[0], failure, 30);
  assert.equal(item.status, "Unknown");
  assert.equal(item.expiration, good.expiration);
  assert.equal(item.lastSuccessAt, good.checkedAt);
  assert.equal(item.stale, true);
  assert.equal(fromMetadata(profiles[0], good, 30, Date.now() + 180000).stale, true);
});

test("expired credential checks remain successful checks without failure backoff", () => {
  const checkedAt = new Date().toISOString();
  const result = recordResult(
    {
      profile: profiles[0],
      status: "Expired",
      checkedAt,
      expiration: new Date(Date.now() - 60000).toISOString(),
    },
    { status: "Unknown", failures: 4, nextRetryAt: 0 },
    1000,
  );
  assert.equal(result.failures, 0);
  assert.equal(result.nextRetryAt, 61000);
  assert.equal(result.lastSuccessAt, checkedAt);
});
test("persisted metadata uses an allowlist and private file permissions", () =>
  context(async (dir, store) => {
    const key = profileKey(profiles[0], scopeFor(settings));
    await store.writeStatus(key, {
      ...recordResult(success(profiles[0])),
      ...{ SecretAccessKey: "FAKE_SECRET", SessionToken: "FAKE_TOKEN" },
    });
    const files = await readdir(join(dir, "metadata"));
    assert.equal(files.length, 1);
    const file = join(dir, "metadata", files[0]);
    const text = await readFile(file, "utf8");
    assert.ok(!text.includes("FAKE_"));
    assert.ok(!text.includes("SecretAccessKey"));
    assert.equal((await stat(file)).mode & 0o777, 0o600);
  }));
test("session lock contention is bounded and releases after errors", () =>
  context(async (_dir, store) => {
    const key = sessionKey(profiles[0], scopeFor(settings));
    let unlock!: () => void;
    const gate = new Promise<void>((resolve) => {
      unlock = resolve;
    });
    let entered!: () => void;
    const ready = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const held = store.withSessionLock(key, async () => {
      entered();
      await gate;
    });
    await ready;
    await assert.rejects(
      store.withSessionLock(key, async () => {}, 0),
      OperationBusyError,
    );
    unlock();
    await held;
    await assert.rejects(
      store.withSessionLock(key, async () => {
        throw new Error("test");
      }),
    );
    await store.withSessionLock(key, async () => {});
  }));
test("concurrent logins share browser login but verify each role independently", () =>
  context(async (dir, store) => {
    const executable = join(dir, "aws"),
      log = join(dir, "calls");
    await writeFile(
      executable,
      `#!${process.execPath}\nconst fs=require('node:fs');const a=process.argv.slice(2);if(a[0]==='--version')process.stdout.write('aws-cli/2.99.0');else if(a[0]==='sso'){fs.appendFileSync(${JSON.stringify(log)},'login\\n');setTimeout(()=>{},50);}else{fs.appendFileSync(${JSON.stringify(log)},a[a.indexOf('--profile')+1]+'\\n');process.stdout.write(JSON.stringify({Expiration:new Date(Date.now()+3600000).toISOString()}));}`,
      { mode: 0o700 },
    );
    const results = await Promise.all(
      profiles.map((profile) => loginProfile(profile, { ...settings, awsCliPath: executable }, store)),
    );
    const calls = (await readFile(log, "utf8")).trim().split("\n");
    assert.equal(calls.filter((line) => line === "login").length, 1);
    assert.equal(calls.length, 3);
    assert.ok(results.every((result) => result.status === "Signed In"));
  }));

test("successful login rearms session recovery even with a single profile", () =>
  context(async (dir, store) => {
    const executable = join(dir, "aws");
    await writeFile(
      executable,
      `#!${process.execPath}\nif(process.argv[2]==='--version')process.stdout.write('aws-cli/2.99.0');else if(process.argv[2]==='configure')process.stdout.write(JSON.stringify({Expiration:new Date(Date.now()+3600000).toISOString()}));`,
      { mode: 0o700 },
    );
    const config = { ...settings, awsCliPath: executable };
    await loginProfile(profiles[0], config, store);
    const session = await store.readSession(sessionKey(profiles[0], scopeFor(config)));
    assert.equal(session.recoverySeen, true);
    assert.equal(session.notified, false);
  }));

test("profile aliases of the same account and role share status metadata", () =>
  context(async (_dir, store) => {
    await writeFile(process.env.AWS_CONFIG_FILE!, fixture.replace("sso_role_name=ReadOnly", "sso_role_name=Developer"));
    let calls = 0;
    const service = new StatusCoordinator(store, {
      findCli: async () => "fake",
      resolve: async (profile) => {
        calls++;
        return success(profile);
      },
    });
    const snapshot = await service.refresh(settings);
    assert.equal(calls, 1);
    assert.equal(snapshot.profiles.length, 2);
    assert.deepEqual(
      snapshot.profiles.map((item) => item.profile.name),
      ["dev", "production"],
    );
  }));

test("a session login failure does not assert unverified roles are signed out", () =>
  context(async (_dir, store) => {
    let calls = 0;
    const service = new StatusCoordinator(store, {
      findCli: async () => "fake",
      resolve: async (profile) => {
        calls++;
        return { profile, status: "Not Signed In", failureKind: "login-required", checkedAt: new Date().toISOString() };
      },
    });
    const first = await service.refresh(settings);
    assert.equal(first.profiles[0].status, "Not Signed In");
    assert.equal(first.profiles[1].status, "Unknown");
    assert.match(first.profiles[1].message!, /has not been rechecked/);
    const second = await service.refresh(settings);
    assert.equal(second.profiles[1].status, "Unknown");
    assert.equal(calls, 1);
  }));
