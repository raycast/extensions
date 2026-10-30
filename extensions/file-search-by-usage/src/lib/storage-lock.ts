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

/**
 * The generation moved under an operation that started before a deletion.
 *
 * Its own class so a caller can tell it apart from a storage write that simply
 * failed. Reporting a failed write as a reset tells the user their data was
 * erased when it was not.
 */
export class DataResetError extends Error {
  constructor() {
    super("Extension data was reset; this older operation was cancelled.");
    this.name = "DataResetError";
  }
}

/** Called only while deletion holds the storage lock. Contains no user data. */
export function invalidateData(): void {
  // The support directory may not exist yet: withStorageLock creates it, and
  // on a first run nothing has taken that lock.
  fs.mkdirSync(environment.supportPath, { recursive: true });
  const temporary = `${generationPath()}.${randomUUID()}`;
  fs.writeFileSync(temporary, randomUUID(), { mode: 0o600 });
  fs.renameSync(temporary, generationPath());
}

/** Never acquire the indexing lock from inside a storage transaction. */
export async function withStorageLock<T>(
  work: (assertCurrent: () => void) => Promise<T>,
  generation: string | undefined,
): Promise<T> {
  fs.mkdirSync(environment.supportPath, { recursive: true });
  const checkGeneration = () => {
    if (generation !== undefined && generation !== dataGeneration())
      throw new DataResetError();
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
