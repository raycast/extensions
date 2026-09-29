import assert from "node:assert/strict";
import test from "node:test";
import { execFile } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  utimes,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import {
  claimRedaction,
  localDay,
  remainingRedactions,
  withUsageLock,
} from "./usage";
import { FREE_DAILY_REDACTIONS } from "./plan";

const DAY = "2026-09-17";
const LIMIT = 2;

test("the free plan allows five files and blocks the sixth until tomorrow", () => {
  assert.equal(FREE_DAILY_REDACTIONS, 5);
  let record;
  for (let i = 0; i < FREE_DAILY_REDACTIONS; i++) {
    const claim = claimRedaction(record, String(i), DAY, FREE_DAILY_REDACTIONS);
    assert.equal(claim.allowed, true);
    assert.equal(claim.remaining, 4 - i);
    record = claim.record;
  }
  assert.equal(
    claimRedaction(record, "sixth", DAY, FREE_DAILY_REDACTIONS).allowed,
    false,
  );
  assert.equal(
    claimRedaction(record, "0", DAY, FREE_DAILY_REDACTIONS).allowed,
    true,
  );
  assert.equal(
    claimRedaction(record, "sixth", "2026-09-18", FREE_DAILY_REDACTIONS)
      .allowed,
    true,
  );
});

test("allows the daily limit of different files", () => {
  const first = claimRedaction(undefined, "a", DAY, LIMIT);
  const second = claimRedaction(first.record, "b", DAY, LIMIT);
  const third = claimRedaction(second.record, "c", DAY, LIMIT);

  assert.deepEqual([first.allowed, first.remaining], [true, 1]);
  assert.deepEqual([second.allowed, second.remaining], [true, 0]);
  assert.deepEqual([third.allowed, third.remaining], [false, 0]);
  assert.deepEqual(third.record.files, ["a", "b"]);
});

test("reopening a file on the same day does not use another redaction", () => {
  const first = claimRedaction(undefined, "a", DAY, LIMIT);
  const second = claimRedaction(first.record, "b", DAY, LIMIT);
  const reopened = claimRedaction(second.record, "a", DAY, LIMIT);

  assert.equal(reopened.allowed, true);
  assert.deepEqual(reopened.record.files, ["a", "b"]);
});

test("the allowance resets on a new day", () => {
  const yesterday = { day: "2026-09-16", files: ["a", "b"] };

  assert.equal(remainingRedactions(yesterday, DAY, LIMIT), 2);
  const claim = claimRedaction(yesterday, "a", DAY, LIMIT);
  assert.deepEqual(claim.record, { day: DAY, files: ["a"] });
});

test("formats the local calendar day", () => {
  assert.equal(localDay(new Date(2026, 0, 5, 23, 59)), "2026-01-05");
});

test("separate command processes cannot overspend or lose daily claims", async () => {
  const directory = await mkdtemp(join(tmpdir(), "cloakshot-usage-"));
  const path = join(directory, "usage.json");
  const worker = join(__dirname, "test-fixtures/claim-usage.ts");
  try {
    await writeFile(path, JSON.stringify({ day: "2026-09-29", files: [] }));
    const results = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        promisify(execFile)(process.execPath, [
          "--import",
          "tsx",
          worker,
          path,
          String(i),
        ]),
      ),
    );
    assert.equal(
      results.filter(({ stdout }) => JSON.parse(stdout).allowed).length,
      5,
    );
    const record = JSON.parse(await readFile(path, "utf8"));
    assert.equal(record.files.length, 5);
    assert.equal(new Set(record.files).size, 5);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("a crashed stale lock recovers and an action failure releases its lock", async () => {
  const directory = await mkdtemp(join(tmpdir(), "cloakshot-usage-lock-"));
  const path = join(directory, "usage");
  try {
    await mkdir(`${path}.lock`);
    const stale = new Date(Date.now() - 60_000);
    await utimes(`${path}.lock`, stale, stale);
    await assert.rejects(
      () =>
        withUsageLock(path, async () => {
          throw new Error("storage failure");
        }),
      /storage failure/,
    );
    assert.equal(
      await withUsageLock(path, async () => "recovered"),
      "recovered",
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("a live claim is never evicted and a competing open has a bounded wait", async () => {
  const directory = await mkdtemp(join(tmpdir(), "cloakshot-live-lock-"));
  const path = join(directory, "usage");
  let releaseOwner!: () => void;
  let ownerEntered!: () => void;
  const hold = new Promise<void>((resolve) => {
    releaseOwner = resolve;
  });
  const entered = new Promise<void>((resolve) => {
    ownerEntered = resolve;
  });
  const owner = withUsageLock(path, async () => {
    ownerEntered();
    await hold;
  });
  try {
    await entered;
    let competingClaimRan = false;
    await assert.rejects(
      () =>
        withUsageLock(path, async () => {
          competingClaimRan = true;
        }),
      /Another file is opening/,
    );
    assert.equal(competingClaimRan, false);
  } finally {
    releaseOwner();
    await owner;
    await rm(directory, { recursive: true, force: true });
  }
});
