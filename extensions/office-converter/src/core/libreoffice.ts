import path from "path";
import fs from "fs/promises";

import libre from "libreoffice-convert";
import { promisify } from "util";

const convertAsync = promisify(libre.convert);

function toExt(format: string): string {
  return format.startsWith(".") ? format : `.${format}`;
}

function changeExt(filePath: string, newExt: string): string {
  const { dir, name } = path.parse(filePath);
  return path.join(dir, `${name}${newExt}`);
}

export async function convertFileCore(inputPath: string, format: string): Promise<void> {
  const buf = await fs.readFile(inputPath);
  format = toExt(format);
  const newBuf = await convertAsync(buf, format, undefined);
  const outputPath = changeExt(inputPath, format);
  await fs.writeFile(outputPath, newBuf);
}
