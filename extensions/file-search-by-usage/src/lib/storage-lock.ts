import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { acquireOwnedLock } from "./owned-lock";
import { environment } from "@raycast/api";

const generationPath = () =>
  path.join(environment.supportPath, "data-generation");

/** Capture before starting work that may later persist results. */
export function dataGeneration(): string {
  try {
    return fs.readFileSync(generationPath(), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return "";
    throw error;
  }
}

/** Called only while deletion holds the storage lock. Contains no user data. */
export function invalidateData(): void {
  const temporary = `${generationPath()}.${randomUUID()}`;
  fs.writeFileSync(temporary, randomUUID(), { mode: 0o600 });
  fs.renameSync(temporary, generationPath());
}

/** Short storage transactions never hold the long-running indexing lock. */
export async function withStorageLock<T>(
  work: (assertCurrent: () => void) => Promise<T>,
  generation: string | undefined,
): Promise<T> {
  fs.mkdirSync(environment.supportPath, { recursive: true });
  const checkGeneration = () => {
    if (generation !== undefined && generation !== dataGeneration())
      throw new Error(
        "Extension data was reset; this older operation was cancelled.",
      );
  };
  const deadline = Date.now() + 5000;
  let owned: ReturnType<typeof acquireOwnedLock>;
  for (;;) {
    checkGeneration();
    try {
      owned = acquireOwnedLock(
        path.join(environment.supportPath, "data-mutation"),
      );
      break;
    } catch (error) {
      if (
        (error as NodeJS.ErrnoException).code !== "ELOCKED" ||
        Date.now() >= deadline
      )
        throw error;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }
  const assertCurrent = () => {
    owned.assertOwned();
    checkGeneration();
  };
  try {
    assertCurrent();
    const result = await work(assertCurrent);
    assertCurrent();
    return result;
  } finally {
    owned.release();
  }
}
