import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { notifierPaths } from "./sound-config.mjs";

export function buildRequestId(sessionId, toolUseId) {
  const left = String(sessionId ?? "session");
  const right = String(toolUseId ?? "tool");
  return `${slugify(left)}_${slugify(right)}`;
}

export function responseFilePath(rootDir, requestId) {
  return join(notifierPaths(rootDir).responsesDir, `${requestId}.json`);
}

export async function clearQuestionResponse(rootDir, requestId) {
  await rm(responseFilePath(rootDir, requestId), { force: true });
}

export async function readQuestionResponse(rootDir, requestId) {
  try {
    const raw = await readFile(responseFilePath(rootDir, requestId), "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function writeQuestionResponse(rootDir, requestId, response) {
  const filePath = responseFilePath(rootDir, requestId);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(response, null, 2));
  return response;
}

export async function waitForQuestionResponse(
  rootDir,
  requestId,
  { timeoutMs = 300000, pollMs = 500 } = {},
) {
  const startedAt = Date.now();

  for (;;) {
    const response = await readQuestionResponse(rootDir, requestId);
    if (response) return response;

    if (Date.now() - startedAt >= timeoutMs) {
      return null;
    }

    await sleep(pollMs);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "value";
}
