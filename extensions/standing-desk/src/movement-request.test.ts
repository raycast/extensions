import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  beginMovementRequest,
  publishMovementRequest,
} from "./movement-request";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

async function requestPath(): Promise<string> {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "standing-desk-request-"),
  );
  temporaryDirectories.push(directory);
  return path.join(directory, "movement-request");
}

describe("movement request publication", () => {
  it("creates a unique request identifier", async () => {
    const target = await requestPath();

    const requestID = await beginMovementRequest(target);

    expect(requestID).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    await expect(readFile(target, "utf8")).resolves.toBe(`${requestID}\n`);
  });

  it("atomically replaces the current request", async () => {
    const target = await requestPath();

    await publishMovementRequest(target, "first-request");
    await publishMovementRequest(target, "latest-request");

    await expect(readFile(target, "utf8")).resolves.toBe("latest-request\n");
    await expect(readdir(path.dirname(target))).resolves.toEqual([
      "movement-request",
    ]);
  });
});
