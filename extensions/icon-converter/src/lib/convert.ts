import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ConvertOptions, InputFormat, OutputFormat } from "./types";

export function accepts(format: InputFormat, file: string): boolean {
  return format.extensions.includes(path.extname(file).slice(1).toLowerCase());
}

/** "icon.png", then "icon 2.png", "icon 3.png"… so nothing is ever overwritten. */
function freePath(dir: string, base: string, ext: string): string {
  let candidate = path.join(dir, `${base}.${ext}`);
  for (let n = 2; existsSync(candidate); n++) candidate = path.join(dir, `${base} ${n}.${ext}`);
  return candidate;
}

/** Convert one file, writing the result next to it. Returns the new file's path. */
export async function convertFile(
  input: string,
  from: InputFormat,
  to: OutputFormat,
  options: ConvertOptions = {},
): Promise<string> {
  if (!accepts(from, input)) throw new Error(`Not a ${from.label} file`);
  const source = await from.open(await readFile(input), options);
  const bytes = await to.write(source, options);
  const output = freePath(path.dirname(input), path.basename(input, path.extname(input)), to.extension);
  await writeFile(output, bytes);
  return output;
}
