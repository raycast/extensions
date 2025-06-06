import path from "path";
import fs from "fs/promises";
import _fs from "fs";

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

async function getOutputPath(inputPath: string, ext: string): Promise<string> {
  let p = changeExt(inputPath, ext);
  let i = 1;
  while (_fs.existsSync(p) && i < 1000) {
    const { dir, name } = path.parse(p);
    const newName = `${name} (${i++})`;
    p = path.join(dir, `${newName}${ext}`);
  }
  return p;
}

export async function convertFileCore(inputPath: string, format: string): Promise<void> {
  const buf = await fs.readFile(inputPath);
  const ext = toExt(format);
  const newBuf = await convertAsync(buf, ext, undefined);
  const outputPath = await getOutputPath(inputPath, ext);
  await fs.writeFile(outputPath, newBuf);
}
