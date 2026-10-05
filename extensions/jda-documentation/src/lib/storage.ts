import { environment } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { mkdir, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { CACHE_SCHEMA } from "./constants";

const SCHEMA_FILE = /^(?:inventory|meta|wiki|faq)-(.+)\.json$/;

// A page file carries its validators in front of the body, so a write cut short
// would otherwise leave a header that keeps answering 304 for a broken body.
export async function writeFileAtomic(
  file: string,
  data: string | Uint8Array,
): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, data);
    await rename(temporary, file);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}

export async function pruneStaleSchemas(): Promise<void> {
  const root = environment.supportPath;
  const pages = path.join(root, "pages");
  const [files, schemas] = await Promise.all([
    readdir(root).catch((): string[] => []),
    readdir(pages).catch((): string[] => []),
  ]);

  const stale = [
    ...files
      .filter((name) => {
        const match = SCHEMA_FILE.exec(name);
        return match !== null && match[1] !== CACHE_SCHEMA;
      })
      .map((name) => path.join(root, name)),
    ...schemas
      .filter((name) => name !== CACHE_SCHEMA)
      .map((name) => path.join(pages, name)),
  ];

  await Promise.all(
    stale.map((target) =>
      rm(target, { recursive: true, force: true }).catch(() => undefined),
    ),
  );
}
