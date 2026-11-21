import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { bearerToken, createSseParser, displayName } from "../src/lib/gateway";
import {
  failureReason,
  formatCost,
  formatSeconds,
  formatUsd,
  isSuccessful,
  modelPageUrl,
  runApiHeaders,
  splitSlug,
  statusLabel,
  urlField,
  type Task,
} from "../src/lib/wiro";

test("API Key Only projects send just the key", () => {
  const headers = runApiHeaders({ apiKey: "key-1" });
  assert.equal(headers["x-api-key"], "key-1");
  assert.equal(headers["x-signature"], undefined);
  assert.equal(headers["x-nonce"], undefined);
});

test("signature projects sign the secret and a nonce with the key", () => {
  const headers = runApiHeaders({ apiKey: "key-1", apiSecret: "secret-1" });
  const expected = createHmac("sha256", "key-1").update(`secret-1${headers["x-nonce"]}`).digest("hex");
  assert.match(headers["x-nonce"], /^\d+$/);
  assert.equal(headers["x-signature"], expected);
});

test("the gateway gets the key, or key:secret, as a Bearer token", () => {
  assert.equal(bearerToken({ apiKey: "key-1" }), "Bearer key-1");
  assert.equal(bearerToken({ apiKey: "key-1", apiSecret: "secret-1" }), "Bearer key-1:secret-1");
  assert.equal(bearerToken({ apiKey: " key-1 ", apiSecret: " " }), "Bearer key-1");
});

test("model IDs are checked before any request", () => {
  assert.deepEqual(splitSlug("openai/gpt-image-2"), ["openai", "gpt-image-2"]);
  assert.throws(() => splitSlug("gpt-image-2"), /owner\/model/);
  assert.equal(modelPageUrl("google/veo3-1"), "https://wiro.ai/models/google/veo3-1");
});

test("file inputs get their empty URL companion field", () => {
  assert.equal(urlField("inputImage", "fileinput"), "inputImageUrl");
  assert.equal(urlField("inputDocumentMultiple", "multifileinput"), "inputDocumentUrlMultiple");
  assert.equal(urlField("inputImage", "combinefileinput"), undefined);
});

test("task status and outputs", () => {
  const task: Task = {
    id: "7",
    socketaccesstoken: "token",
    status: "task_postprocess_end",
    pexit: "0",
    totalcost: "0.0336",
    elapsedseconds: "12.0000",
    outputs: [
      { name: "0.png", contenttype: "image/png", url: "https://cdn1.wiro.ai/a/0.png" },
      { name: "1.mp4", contenttype: "", url: "https://cdn1.wiro.ai/a/1.mp4?x=1" },
      { name: "log.txt", contenttype: "text/plain", url: "https://cdn1.wiro.ai/a/log.txt" },
    ],
  };
  assert.equal(isSuccessful(task), true);
  assert.equal(isSuccessful({ ...task, pexit: "1" }), false);
  assert.equal(statusLabel("task_queue"), "Waiting in queue");
  assert.equal(statusLabel("task_output"), "Generating");
  assert.equal(statusLabel("task_postprocess_end"), "Done");
  assert.equal(isSuccessful({ ...task, pexit: "" }), true, "an empty exit code is not a failure");
  assert.equal(isSuccessful({ ...task, status: "task_cancel" }), false);
  assert.match(failureReason({ status: "task_postprocess_end" }), /could not finish/);
  assert.equal(failureReason({ ...task, status: "task_cancel" }), "The task was cancelled.");
});

test("money and time are formatted for people", () => {
  assert.equal(formatUsd(0.006), "$0.006");
  assert.equal(formatUsd(0.05), "$0.05");
  assert.equal(formatUsd(0.125), "$0.125");
  assert.equal(formatUsd(0.5), "$0.50");
  assert.equal(formatUsd(1.88), "$1.88");
  assert.equal(formatCost("0"), undefined);
  assert.equal(formatCost("0.0336"), "$0.034");
  assert.equal(formatSeconds("12.0000"), "12 s");
  assert.equal(formatSeconds(95), "1 min 35 s");
});

test("server-sent events are split into data payloads across chunks", () => {
  const events: string[] = [];
  const parser = createSseParser((data) => events.push(data));
  parser.push('data: {"a":');
  parser.push("1}\r\n\r\n: keep-alive\n\ndata: [DO");
  parser.push("NE]\n\n");
  parser.push("data: last");
  parser.end();
  assert.deepEqual(events, ['{"a":1}', "[DONE]", "last"]);
});

test("gateway model names drop the Wiro prefix", () => {
  assert.equal(displayName("(Wiro) GPT-5.4 Mini", "openai/gpt-5-4-mini"), "GPT-5.4 Mini");
  assert.equal(displayName(undefined, "openai/gpt-5-4-mini"), "openai/gpt-5-4-mini");
});
