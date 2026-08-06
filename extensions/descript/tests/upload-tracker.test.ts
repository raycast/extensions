import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { beforeEach, describe, expect, it } from "vitest";

import { __resetLocalStorage } from "./mocks/raycast-api";
import {
  addUploadRecord,
  aggregateState,
  enrichRecord,
  listUploads,
  loadUploadRecords,
  statusFilePathFor,
  writeFailedStatus,
  type EnrichedUploadFile,
  type UploadRecord,
} from "../src/lib/upload-tracker";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function makeRecord(jobId: string, fileNames: string[], startedAt = new Date().toISOString()): UploadRecord {
  return {
    id: `${jobId}-record`,
    jobId,
    isExistingProject: false,
    startedAt,
    files: fileNames.map((fileName) => ({
      fileName,
      filePath: `/tmp/${fileName}`,
      fileSize: 100,
      statusFilePath: statusFilePathFor(jobId, fileName),
    })),
  };
}

async function writeStatus(statusFilePath: string, contents: string): Promise<void> {
  await mkdir(dirname(statusFilePath), { recursive: true });
  await writeFile(statusFilePath, contents, "utf8");
}

function file(status: EnrichedUploadFile["status"]): EnrichedUploadFile {
  return { fileName: "f", filePath: "/tmp/f", fileSize: 1, statusFilePath: "/tmp/f.status.json", status };
}

beforeEach(() => {
  __resetLocalStorage();
});

describe("aggregateState", () => {
  it("is pending for an empty file list", () => {
    expect(aggregateState([])).toBe("pending");
  });

  it("is failed as soon as any file failed", () => {
    expect(aggregateState([file("done"), file("failed"), file("uploading")])).toBe("failed");
  });

  it("is completed only when every file is done", () => {
    expect(aggregateState([file("done"), file("done")])).toBe("completed");
    expect(aggregateState([file("done"), file("pending")])).toBe("pending");
  });

  it("is uploading while any file is in flight and none failed", () => {
    expect(aggregateState([file("done"), file("uploading")])).toBe("uploading");
  });
});

describe("enrichRecord", () => {
  it("treats a missing status file as pending", async () => {
    const record = makeRecord("job-missing", ["a.mp4"]);
    const enriched = await enrichRecord(record);
    expect(enriched.files[0].status).toBe("pending");
    expect(enriched.aggregate).toBe("pending");
  });

  it("reads a valid terminal status file", async () => {
    const record = makeRecord("job-done", ["a.mp4"]);
    await writeStatus(record.files[0].statusFilePath, '{"status":"done","httpCode":200,"finishedAt":1700000000}');
    const enriched = await enrichRecord(record);
    expect(enriched.files[0].status).toBe("done");
    expect(enriched.files[0].httpCode).toBe(200);
    expect(enriched.aggregate).toBe("completed");
    expect(enriched.finishedAt).toBe(1700000000);
  });

  it("recovers legacy malformed payloads with octal-looking httpCode", async () => {
    const record = makeRecord("job-legacy", ["a.mp4"]);
    await writeStatus(
      record.files[0].statusFilePath,
      '{"status":"failed","httpCode":000,"curlExit":7,"finishedAt":1700000000}',
    );
    const enriched = await enrichRecord(record);
    expect(enriched.files[0].status).toBe("failed");
    expect(enriched.files[0].httpCode).toBe(0);
    expect(enriched.files[0].curlExit).toBe(7);
    expect(enriched.aggregate).toBe("failed");
  });

  it("keeps a fresh upload in the uploading state", async () => {
    const record = makeRecord("job-fresh", ["a.mp4"]);
    const startedAt = Math.floor(Date.now() / 1000);
    await writeStatus(record.files[0].statusFilePath, `{"status":"uploading","fileSize":100,"startedAt":${startedAt}}`);
    const enriched = await enrichRecord(record);
    expect(enriched.files[0].status).toBe("uploading");
    expect(enriched.aggregate).toBe("uploading");
  });

  it("coerces a stale upload to failed and persists the corrected status", async () => {
    const fourHoursAgoMs = Date.now() - 4 * HOUR_MS;
    const record = makeRecord("job-stale", ["a.mp4"], new Date(fourHoursAgoMs).toISOString());
    await writeStatus(
      record.files[0].statusFilePath,
      `{"status":"uploading","fileSize":100,"startedAt":${Math.floor(fourHoursAgoMs / 1000)}}`,
    );

    const enriched = await enrichRecord(record);
    expect(enriched.files[0].status).toBe("failed");
    expect(enriched.aggregate).toBe("failed");

    const persisted = JSON.parse(await readFile(record.files[0].statusFilePath, "utf8"));
    expect(persisted.status).toBe("failed");
  });

  it("coerces a stale record whose status file was never written", async () => {
    const record = makeRecord("job-stale-missing", ["a.mp4"], new Date(Date.now() - 4 * HOUR_MS).toISOString());
    const enriched = await enrichRecord(record);
    expect(enriched.files[0].status).toBe("failed");
  });
});

describe("listUploads pruning", () => {
  it("prunes terminal records older than the retention window and keeps the rest", async () => {
    const oldFinishSeconds = Math.floor((Date.now() - 8 * DAY_MS) / 1000);
    const oldRecord = makeRecord("job-old", ["old.mp4"], new Date(Date.now() - 8 * DAY_MS).toISOString());
    await writeStatus(
      oldRecord.files[0].statusFilePath,
      `{"status":"done","httpCode":200,"finishedAt":${oldFinishSeconds}}`,
    );

    const freshRecord = makeRecord("job-new", ["new.mp4"]);
    await writeStatus(
      freshRecord.files[0].statusFilePath,
      `{"status":"done","httpCode":200,"finishedAt":${Math.floor(Date.now() / 1000)}}`,
    );

    await addUploadRecord(oldRecord);
    await addUploadRecord(freshRecord);

    const listed = await listUploads();
    expect(listed.map((r) => r.jobId)).toEqual(["job-new"]);

    const remaining = await loadUploadRecords();
    expect(remaining.map((r) => r.jobId)).toEqual(["job-new"]);
  });
});

describe("statusFilePathFor", () => {
  it("is deterministic for the same job and file name", () => {
    expect(statusFilePathFor("job-1", "a b.mp4")).toBe(statusFilePathFor("job-1", "a b.mp4"));
  });

  it("does not collide for names that sanitize to the same string", () => {
    expect(statusFilePathFor("job-1", "a b.mp4")).not.toBe(statusFilePathFor("job-1", "a_b.mp4"));
    expect(statusFilePathFor("job-1", "a?b.mp4")).not.toBe(statusFilePathFor("job-1", "a b.mp4"));
  });
});

describe("writeFailedStatus", () => {
  it("writes a parseable terminal payload", async () => {
    const path = statusFilePathFor("job-wfs", "a.mp4");
    await mkdir(dirname(path), { recursive: true });
    await writeFailedStatus(path, { curlExit: -1 });

    const payload = JSON.parse(await readFile(path, "utf8"));
    expect(payload.status).toBe("failed");
    expect(payload.curlExit).toBe(-1);
    expect(typeof payload.finishedAt).toBe("number");
  });
});
