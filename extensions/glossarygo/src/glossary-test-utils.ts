import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const temporaryDirectories: string[] = [];

export const createTemporaryPath = async (filename: string): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), "glossarygo-"));
  temporaryDirectories.push(directory);
  return join(directory, filename);
};

export const writeGlossary = async (contents: string | Uint8Array, filename = "glossary.yaml"): Promise<string> => {
  const path = await createTemporaryPath(filename);
  await writeFile(path, contents);
  return path;
};

export const removeTemporaryDirectories = async (): Promise<void> => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { force: true, recursive: true })));
};
