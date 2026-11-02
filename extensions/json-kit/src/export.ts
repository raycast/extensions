import { link, open, rename, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { basename, dirname, join } from "node:path";

export function targetPath(
  directory: string | undefined,
  name: string,
): string {
  if (!directory) throw new Error("Choose a directory");
  if (
    !name ||
    name === "." ||
    name === ".." ||
    basename(name) !== name ||
    name.includes("/")
  )
    throw new Error("Enter a file name without a path");
  return join(directory, name);
}

export async function writeJson(
  path: string,
  data: string,
  overwrite: boolean,
): Promise<void> {
  const temp = join(dirname(path), `.json-kit-${randomUUID()}.tmp`);
  let created = false;
  try {
    const handle = await open(temp, "wx", 0o600);
    created = true;
    try {
      await handle.writeFile(data, "utf8");
    } finally {
      await handle.close();
    }
    if (overwrite) {
      await rename(temp, path);
      created = false;
    } else {
      await link(temp, path);
    }
  } finally {
    if (created) await unlink(temp);
  }
}
