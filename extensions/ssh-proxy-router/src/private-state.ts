import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

export async function privateDirectory(directory: string, io = fs) {
  await io.mkdir(directory, { recursive: true, mode: 0o700 });
  await io.chmod(directory, 0o700);
}

export async function atomicPrivateWrite(file: string, text: string, io = fs) {
  const temporary = path.join(path.dirname(file), `.${path.basename(file)}.${randomUUID()}.tmp`);
  try {
    await io.writeFile(temporary, text, { flag: "wx", mode: 0o600 });
    await io.rename(temporary, file);
  } finally {
    await io.rm(temporary, { force: true });
  }
}
