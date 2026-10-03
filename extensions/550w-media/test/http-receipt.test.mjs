import test from "node:test";
import assert from "node:assert/strict";
import { resultSummary } from "../src/result-summary.mjs";
import { taskQuery, refreshTaskResult } from "../src/task-query.mjs";
test("manual recovery switches from admission to task detail and retains its query after completion", async () => {
  let query;
  const calls = [];
  const request = async (endpoint, auth, values) => {
    calls.push({ endpoint, values });
    return endpoint === "receipt"
      ? { code: 200, kind: "video", status: "accepted", taskId: "task-123" }
      : {
          code: 200,
          status: "success",
          resultUrl: "https://cdn.example.com/result.mp4",
        };
  };
  for (let i = 0; i < 3; i++) {
    const next = await refreshTaskResult(
      "receipt_query",
      query,
      "operation-123",
      {},
      request,
    );
    query = next.query;
    if (i)
      assert.equal(
        resultSummary("video", next.result, query.taskId).status,
        "success",
      );
  }
  assert.deepEqual(calls, [
    { endpoint: "receipt", values: { operationId: "operation-123" } },
    { endpoint: "taskDetail", values: { taskId: "task-123" } },
    { endpoint: "taskDetail", values: { taskId: "task-123" } },
  ]);
});
test("preparing recovery advances to a validated task query on the next receipt", () => {
  assert.equal(
    taskQuery("receipt_query", {
      code: 200,
      kind: "video",
      status: "preparing",
    }),
    undefined,
  );
  assert.deepEqual(
    taskQuery("receipt_query", {
      code: 200,
      kind: "video",
      status: "accepted",
      taskId: "task-123",
    }),
    { endpoint: "taskDetail", taskId: "task-123" },
  );
  for (const taskId of ["bad/task", " task ", "bad?token=x"])
    assert.equal(
      taskQuery("receipt_query", { code: 200, kind: "video", taskId }),
      undefined,
    );
  assert.equal(taskQuery("video", null), undefined);
});
test("share admission preserves pending and failure states and never opens premature results", () => {
  for (const status of ["preparing", "processing", "failed", "expired"]) {
    const summary = resultSummary("share", {
      code: 200,
      status,
      failReason: "Resolution failed",
      data: { video: "https://cdn.example.com/result.mp4" },
    });
    assert.equal(summary.status, status);
    assert.equal(summary.url, undefined);
    if (status === "failed") assert.equal(summary.failure, "Resolution failed");
  }
});
test("recovered image and video receipts query the accepted task, not admission again", () => {
  assert.deepEqual(
    taskQuery(
      "receipt_query",
      { code: 200, kind: "video", taskId: "video-task" },
      "operation",
    ),
    { endpoint: "taskDetail", taskId: "video-task" },
  );
  assert.deepEqual(
    taskQuery(
      "receipt_query",
      { code: 200, kind: "image", taskId: "image-task" },
      "operation",
    ),
    { endpoint: "imageWatermarkTaskDetail", taskId: "image-task" },
  );
  assert.equal(
    taskQuery("receipt_query", { code: 200, kind: "video" }, "operation"),
    undefined,
  );
  assert.equal(
    taskQuery("receipt_query", {
      code: 200,
      kind: "share",
      taskId: "not-a-task",
    }),
    undefined,
  );
});
test("HTTP image admission preserves top-level task ID and waiting status", () => {
  const result = {
    code: 200,
    status: "accepted",
    kind: "image",
    taskId: "task",
  };
  assert.equal(resultSummary("image", result).status, "waiting");
  assert.equal(resultSummary("image", result).taskId, "task");
  assert.equal(taskQuery("image", result).taskId, "task");
});
test("recovered share receipt exposes only validated completed download URL", () => {
  assert.equal(
    resultSummary("receipt_query", {
      code: 200,
      status: "success",
      data: { video: "https://cdn.example.com/result.mp4" },
    }).url,
    "https://cdn.example.com/result.mp4",
  );
  assert.equal(
    resultSummary("receipt_query", {
      code: 200,
      status: "preparing",
      data: { video: "https://cdn.example.com/result.mp4" },
    }).url,
    undefined,
  );
});
