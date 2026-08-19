import { randomUUID } from "node:crypto";
import { mkdir, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export async function beginMovementRequest(
  requestPath: string,
): Promise<string> {
  const requestID = randomUUID();
  await publishMovementRequest(requestPath, requestID);
  return requestID;
}

export async function publishMovementRequest(
  requestPath: string,
  requestID: string,
): Promise<void> {
  await mkdir(path.dirname(requestPath), { recursive: true });
  const temporaryPath = `${requestPath}.${process.pid}.${randomUUID()}.tmp`;

  try {
    await writeFile(temporaryPath, `${requestID}\n`, {
      encoding: "utf8",
      flag: "wx",
    });
    await rename(temporaryPath, requestPath);
  } catch (error) {
    await unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
}
