import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { captureException, environment } from "@raycast/api";
import { FILE_NAMES } from "../constants";
import { CaptureSchema } from "../schemas";
import type { Capture, CaptureData } from "../types";
import { getCurrentTimestamp } from "./date-formatter";
import { isValidId } from "./sanitize";

const getCapturesPath = () => path.join(environment.supportPath, FILE_NAMES.CAPTURES_JSON);
const getCapturesDir = () => path.join(environment.supportPath, FILE_NAMES.CAPTURES_DIR);
const getCaptureImagePath = (id: string) => path.join(getCapturesDir(), `${id}.png`);

const ensureCapturesFileExists = async () => {
  const capturesPath = getCapturesPath();
  const dir = path.dirname(capturesPath);

  try {
    if (!fsSync.existsSync(dir)) {
      await fs.mkdir(dir, { recursive: true });
    }

    if (!fsSync.existsSync(capturesPath)) {
      await fs.writeFile(capturesPath, JSON.stringify([], null, 2));
    }
  } catch (error) {
    captureException(new Error("Failed to ensure captures file exists", { cause: error }));
    throw error;
  }
};

const readCaptures = async (): Promise<Capture[]> => {
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

const writeCaptures = async (captures: Capture[]) => {
  const capturesPath = getCapturesPath();

  try {
    await fs.writeFile(capturesPath, JSON.stringify(captures, null, 2));
  } catch (error) {
    captureException(new Error("Failed to write captures file", { cause: error }));
    throw error;
  }
};

export const createCapture = async (
  id: string,
  stackName: string,
  title: string,
  imagePath: string,
  data: CaptureData,
): Promise<Capture> => {
  try {
    if (!isValidId(id)) {
      throw new Error(`Invalid capture id: ${id}`);
    }

    await ensureCapturesFileExists();

    const captures = await readCaptures();
    const timestamp = getCurrentTimestamp();

    const newCapture: Capture = {
      id,
      stackName,
      title,
      imagePath,
      data,
      createdAt: timestamp,
    };

    const validated = CaptureSchema.parse(newCapture);
    captures.push(validated);

    await writeCaptures(captures);
    return validated;
  } catch (error) {
    captureException(new Error("Failed to create capture", { cause: error }));
    throw error;
  }
};

export const deleteCapture = async (captureId: string) => {
  try {
    if (!isValidId(captureId)) {
      throw new Error(`Invalid capture id: ${captureId}`);
    }

    const capturesPath = getCapturesPath();
    const capturesDir = getCapturesDir();

    if (!fsSync.existsSync(capturesPath) || !fsSync.existsSync(capturesDir)) {
      return;
    }

    const captures = await readCaptures();
    const filteredCaptures = captures.filter((capture) => capture.id !== captureId);

    await writeCaptures(filteredCaptures);

    const imagePath = getCaptureImagePath(captureId);
    if (fsSync.existsSync(imagePath)) {
      await fs.unlink(imagePath);
    }
  } catch (error) {
    captureException(new Error(`Failed to delete capture ${captureId}`, { cause: error }));
    throw error;
  }
};
