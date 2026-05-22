import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { MetadataByTrigger } from "./types";

export interface MetadataStore {
  read(): Promise<MetadataByTrigger>;
  write(metadata: MetadataByTrigger): Promise<void>;
}

export class JsonMetadataStore implements MetadataStore {
  constructor(private readonly path: string) {}

  async read(): Promise<MetadataByTrigger> {
    try {
      return JSON.parse(await readFile(this.path, "utf8")) as MetadataByTrigger;
    } catch (error) {
      if (isNotFound(error)) {
        return {};
      }
      throw error;
    }
  }

  async write(metadata: MetadataByTrigger): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    await writeFile(
      this.path,
      `${JSON.stringify(metadata, null, 2)}\n`,
      "utf8",
    );
  }
}

function isNotFound(error: unknown): boolean {
  return Boolean(
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "ENOENT",
  );
}
