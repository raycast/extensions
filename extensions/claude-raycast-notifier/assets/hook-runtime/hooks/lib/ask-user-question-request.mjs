import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { notifierPaths } from "./sound-config.mjs";

export function requestFilePath(rootDir, requestId) {
  return join(notifierPaths(rootDir).requestsDir, `${requestId}.json`);
}

export async function writeQuestionRequest(rootDir, request) {
  const filePath = requestFilePath(rootDir, request.requestId);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(request, null, 2));
  return request;
}

export async function readQuestionRequest(rootDir, requestId) {
  try {
    const raw = await readFile(requestFilePath(rootDir, requestId), "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function clearQuestionRequest(rootDir, requestId) {
  await rm(requestFilePath(rootDir, requestId), { force: true });
}

export async function listQuestionRequests(rootDir) {
  const { requestsDir } = notifierPaths(rootDir);

  try {
    const entries = await readdir(requestsDir);
    const requests = await Promise.all(
      entries
        .filter((entry) => entry.endsWith(".json"))
        .map(async (entry) => {
          try {
            const raw = await readFile(join(requestsDir, entry), "utf8");
            return JSON.parse(raw);
          } catch {
            return null;
          }
        }),
    );
    return requests.filter(Boolean);
  } catch {
    return [];
  }
}
