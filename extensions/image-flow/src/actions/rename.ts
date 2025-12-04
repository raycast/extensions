import { Config, Input, Output } from "../types";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { saveStreamToFile } from "../supports/file";
import fs from "fs";

const availableVariables: Record<string, () => string> = {
  uuid: uuidFormater,
  timestamp: timestampFormater,
  yyyy: dateFormater("yyyy"),
  yyyy_mm: dateFormater("yyyy-mm"),
  yyyy_mm_dd: dateFormater("yyyy-mm-dd"),
};

/**
 * Rename input file name.
 *
 * @param i must be an image file path
 * @param config
 *
 * @returns renamed image file path
 */
export default async function (i: Input, config: Config): Promise<Output> {
  const inputPath = i.value;
  const newName = buildRenamedName(path.basename(inputPath), config);
  const newPath = path.join(path.dirname(inputPath), newName);

  await saveStreamToFile(fs.createReadStream(inputPath), newPath);
  if (fs.existsSync(inputPath)) {
    fs.unlinkSync(inputPath);
  }

  return { type: "filepath", value: newPath } as Output;
}

function buildRenamedName(filename: string, config: Config): string {
  const to = config?.["to"] as string;
  if (!to) {
    return filename;
  }

  const newName = extractVariables(to)
    .filter((v) => !!v && v in availableVariables)
    .reduce((acc, v) => {
      return acc.replace(`{${v}}`, availableVariables[v]());
    }, to);

  return `${newName}${path.extname(filename)}`;
}

function extractVariables(str: string): string[] {
  return Array.from(str.matchAll(/\{([a-zA-Z0-9_]+)}/g), (m) => m[1]);
}

function uuidFormater(): string {
  return uuidv4();
}

function timestampFormater(): string {
  return new Date().getTime().toString();
}

function dateFormater(format?: string): () => string {
  return () => {
    const date = new Date();
    const yyyy = date.getFullYear();
    const mm = (date.getMonth() + 1).toString().padStart(2, "0");
    const dd = date.getDate().toString().padStart(2, "0");

    if (format === "yyyy") {
      return yyyy.toString();
    }

    if (format === "yyyy-mm") {
      return `${yyyy}-${mm}`;
    }

    if (format === "yyyy-mm-dd") {
      return `${yyyy}-${mm}-${dd}`;
    }

    return `${yyyy}-${mm}-${dd}`;
  };
}
