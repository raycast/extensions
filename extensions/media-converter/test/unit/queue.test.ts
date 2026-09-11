import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { LocalStorage } from "@raycast/api";
import {
  enqueueConversionJobs,
  listQueueJobs,
  patchQueueJob,
  recoverInterruptedQueueJobs,
} from "../../src/utils/queue";

beforeEach(async () => {
  await LocalStorage.clear();
});

describe("conversion queue persistence", () => {
  it("enqueues jobs in input order", async () => {
    await enqueueConversionJobs(["/tmp/a.mp4", "/tmp/b.mp4"], {
      outputFormat: ".webm",
      quality: { ".webm": { encodingMode: "crf", crf: 60, quality: "good" } } as never,
    });
    const jobs = await listQueueJobs();
    assert.deepEqual(
      jobs.map((job) => job.input),
      ["/tmp/a.mp4", "/tmp/b.mp4"],
    );
    assert.ok(jobs.every((job) => job.status === "pending"));
  });

  it("only marks running jobs interrupted during explicit startup recovery", async () => {
    const [job] = await enqueueConversionJobs(["/tmp/a.mp4"], {
      outputFormat: ".mp4",
      quality: { ".mp4": { encodingMode: "crf", crf: 60, preset: "medium" } } as never,
    });
    await patchQueueJob(job.id, { status: "running", progress: 42 });
    assert.equal((await listQueueJobs())[0].status, "running");
    const [recovered] = await recoverInterruptedQueueJobs();
    assert.equal(recovered.status, "interrupted");
    assert.match(recovered.error ?? "", /Raycast stopped/);
  });

  it("drops malformed stored jobs", async () => {
    await LocalStorage.setItem("conversion-queue", JSON.stringify({ v: 1, jobs: [{ id: "bad" }] }));
    assert.deepEqual(await listQueueJobs(), []);
  });
});
