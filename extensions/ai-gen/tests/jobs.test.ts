import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { claimJob, isActive, JOB_TIMEOUT, readJob, saveJob } from "../src/lib/compatible-images/jobs";

test("concurrent worker launches claim a paid job only once, including after failure", async () => {
  const directory = await mkdtemp(join(tmpdir(), "image-jobs-"));
  try {
    const job = { id: randomUUID(), status: "pending" as const, startedAt: Date.now() };
    await saveJob(directory, job);
    const claims = await Promise.all(Array.from({ length: 10 }, () => claimJob(directory, job.id)));
    assert.equal(claims.filter(Boolean).length, 1);
    await saveJob(directory, { ...job, status: "failed", error: "Request timed out" });
    assert.equal(await claimJob(directory, job.id), false);
    assert.equal((await readJob(directory, job.id)).error, "Request timed out");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("saved results survive a new reader; expired jobs have unknown status without automatic retry", async () => {
  const directory = await mkdtemp(join(tmpdir(), "image-jobs-"));
  try {
    const job = { id: randomUUID(), status: "running" as const, startedAt: Date.now() - JOB_TIMEOUT - 1 };
    await saveJob(directory, job);
    assert.equal(isActive(await readJob(directory, job.id)), false);
    assert.equal((await readJob(directory, job.id)).status, "running");
    const result = { path: "/tmp/generated.png", markdown: "![image](file:///tmp/generated.png)", model: "test" };
    await saveJob(directory, { ...job, status: "succeeded", result });
    assert.deepEqual((await readJob(directory, job.id)).result, result);
    assert.equal(isActive(await readJob(directory, job.id)), false);
    assert.ok(JSON.parse(await readFile(join(directory, `${job.id}.json`), "utf8")));
    await assert.rejects(readJob(directory, "../../outside"), /Invalid image job ID/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
