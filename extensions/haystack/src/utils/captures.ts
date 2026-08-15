import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { captureException, environment } from "@raycast/api";
import { FILE_NAMES } from "../constants";
import { CaptureSchema } from "../schemas";
import type { Capture, CaptureData, CaptureStack } from "../types";
import { getCurrentTimestamp } from "./date-formatter";
import { isValidId } from "./sanitize";

// ============================================================================
// PATH HELPERS
// ============================================================================

const getCapturesPath = () => path.join(environment.supportPath, FILE_NAMES.CAPTURES_JSON);
const getCapturesDir = () => path.join(environment.supportPath, FILE_NAMES.CAPTURES_DIR);
const getCaptureImagePath = (id: string) => path.join(getCapturesDir(), `${id}.png`);

// ============================================================================
// CONCURRENCY CONTROL
// ============================================================================

/**
 * Operation queue - Serializes ALL read-modify-write operations to prevent race conditions.
 *
 * Without this, two simultaneous operations could:
 * 1. Both read [capture1, capture2]
 * 2. Both modify their local copy
 * 3. Both write back, causing one update to be lost
 *
 * This queue ensures the entire read-modify-write cycle is atomic.
 */
let operationQueue: Promise<void> = Promise.resolve();

/**
 * Executes an update function with exclusive access to the captures file.
 * Guarantees that read-modify-write happens atomically without interference.
 *
 * @param updateFn - Function that takes current captures and returns updated captures
 * @returns Promise that resolves when the operation completes
 */
const atomicUpdate = async (updateFn: (captures: Capture[]) => Promise<{ captures: Capture[] }>): Promise<void> => {
  // Chain this operation onto the queue
  operationQueue = operationQueue.then(async () => {
    // CRITICAL SECTION: Read-Modify-Write must happen atomically
    const currentCaptures = await readCapturesUnsafe();
    const { captures: updatedCaptures } = await updateFn(currentCaptures);
    await writeCapturesUnsafe(updatedCaptures);
  });

  return operationQueue;
};

// ============================================================================
// FILE OPERATIONS (INTERNAL - NOT THREAD-SAFE)
// ============================================================================
// These functions perform raw I/O and must ONLY be called within atomicUpdate()

/**
 * Ensures the captures file exists using atomic file creation.
 * Safe to call multiple times - uses 'wx' flag to avoid TOCTOU race conditions.
 */
export const ensureCapturesFileExists = async () => {
  const capturesPath = getCapturesPath();
  const dir = path.dirname(capturesPath);

  try {
    await fs.mkdir(dir, { recursive: true });

    await fs.writeFile(capturesPath, JSON.stringify([], null, 2), {
      flag: "wx",
    });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code !== "EEXIST") {
      captureException(new Error("Failed to ensure captures file exists", { cause: error }));
      throw error;
    }
  }
};

/**
 * Reads captures from disk. NOT thread-safe - must be called within atomicUpdate().
 */
const readCapturesUnsafe = async (): Promise<Capture[]> => {
  const capturesPath = getCapturesPath();

  try {
    await ensureCapturesFileExists();

    const fileContent = await fs.readFile(capturesPath, "utf-8");
    const parsed = JSON.parse(fileContent);

    if (!Array.isArray(parsed)) {
      captureException(new Error("Captures file is not an array"));
      return [];
    }

    const validCaptures: Capture[] = [];
    for (const item of parsed) {
      try {
        const validated = CaptureSchema.parse(item);
        validCaptures.push(validated);
      } catch (error) {
        captureException(
          new Error(`Invalid capture data: ${JSON.stringify(item)}`, {
            cause: error,
          }),
        );
      }
    }

    return validCaptures;
  } catch (error) {
    captureException(new Error("Failed to read captures file", { cause: error }));
    return [];
  }
};

/**
 * Writes captures to disk atomically. NOT thread-safe - must be called within atomicUpdate().
 * Uses temp file + rename for atomic writes (prevents partial writes on crash).
 */
const writeCapturesUnsafe = async (captures: Capture[]): Promise<void> => {
  const capturesPath = getCapturesPath();

  try {
    // Atomic write pattern: write to temp file, then rename
    const tempPath = `${capturesPath}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(captures, null, 2));
    await fs.rename(tempPath, capturesPath);
  } catch (error) {
    captureException(new Error("Failed to write captures file", { cause: error }));
    throw error;
  }
};

// ============================================================================
// PUBLIC API (THREAD-SAFE)
// ============================================================================
// These functions use atomicUpdate() to ensure thread-safe operations

/**
 * Creates a new capture and adds it to the captures file.
 * Thread-safe: Can be called concurrently without data loss.
 */
export const createCapture = async (
  id: string,
  stack: CaptureStack,
  title: string,
  imagePath: string,
  data: CaptureData,
): Promise<void> => {
  try {
    if (!isValidId(id)) {
      throw new Error(`Invalid capture id: ${id}`);
    }

    await ensureCapturesFileExists();

    const timestamp = getCurrentTimestamp();
    const newCapture: Capture = {
      id,
      stack,
      title,
      imagePath,
      data,
      createdAt: timestamp,
    };

    const validated = CaptureSchema.parse(newCapture);

    await atomicUpdate(async (captures) => {
      // Check if capture with this ID already exists
      const existingIndex = captures.findIndex((c) => c.id === id);
      if (existingIndex !== -1) {
        throw new Error(`Capture with id ${id} already exists`);
      }

      captures.push(validated);
      return { captures, result: validated };
    });
  } catch (error) {
    captureException(new Error("Failed to create capture", { cause: error }));
    throw error;
  }
};

/**
 * Deletes a capture from the captures file and removes its image.
 * Thread-safe: Can be called concurrently without data loss.
 */
export const deleteCapture = async (captureId: string): Promise<void> => {
  try {
    if (!isValidId(captureId)) {
      throw new Error(`Invalid capture id: ${captureId}`);
    }

    const capturesPath = getCapturesPath();
    const capturesDir = getCapturesDir();

    if (!fsSync.existsSync(capturesPath) || !fsSync.existsSync(capturesDir)) {
      return;
    }

    await atomicUpdate(async (captures) => {
      const filteredCaptures = captures.filter((capture) => capture.id !== captureId);
      return { captures: filteredCaptures, result: undefined };
    });

    const imagePath = getCaptureImagePath(captureId);
    if (fsSync.existsSync(imagePath)) {
      await fs.unlink(imagePath);
    }
  } catch (error) {
    captureException(new Error(`Failed to delete capture ${captureId}`, { cause: error }));
    throw error;
  }
};
