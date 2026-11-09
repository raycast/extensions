import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseShippedHugeicons, ShippedHugeicons } from "../../src/icons/hugeicons";

export const FIXTURES = join(__dirname, "fixtures");

export function fixture(file: string): string {
  return readFileSync(join(FIXTURES, file), "utf8");
}

export function fixtureJson<T = unknown>(file: string): T {
  return JSON.parse(fixture(file)) as T;
}

export interface LucideSample {
  tags: Record<string, string[]>;
  categories: Record<string, string[]>;
  nodes: Record<string, unknown>;
  /** Names in the older release the New set is measured against. */
  baseline: string[];
}

/** A few real Lucide icons (ISC), trimmed from lucide.dev's API. */
export const lucideSample = (): LucideSample => fixtureJson<LucideSample>("lucide-sample.json");

/** A hand-written slice of the Hugeicons list the extension ships (assets/hugeicons-icons.json). */
export const shippedHugeicons = (): ShippedHugeicons =>
  parseShippedHugeicons(fixtureJson("hugeicons-shipped-sample.json"));

function header(path: string, size: number, type: string, prefix = ""): Buffer {
  const block = Buffer.alloc(512);
  block.write(path, 0, 100, "utf8");
  block.write("0000644\0", 100);
  block.write("0000000\0", 108);
  block.write("0000000\0", 116);
  block.write(size.toString(8).padStart(11, "0") + "\0", 124);
  block.write("00000000000\0", 136);
  block.write("        ", 148);
  block.write(type, 156);
  block.write("ustar\0" + "00", 257);
  block.write(prefix, 345, 155, "utf8");
  let sum = 0;
  for (const byte of block) sum += byte;
  block.write(sum.toString(8).padStart(6, "0") + "\0 ", 148);
  return block;
}

function padded(data: Buffer): Buffer {
  return Buffer.concat([data, Buffer.alloc((512 - (data.length % 512)) % 512)]);
}

export interface TarFile {
  path: string;
  data: string;
  /** How a long path is carried: the ustar prefix field, a GNU long-name entry, or a pax header. */
  via?: "prefix" | "gnu" | "pax";
}

/** A minimal tar archive, the way npm and common tools write them. */
export function makeTar(files: TarFile[]): Buffer {
  const parts: Buffer[] = [];
  for (const file of files) {
    const data = Buffer.from(file.data, "utf8");
    if (file.via === "gnu") {
      const name = Buffer.from(file.path + "\0", "utf8");
      parts.push(header("././@LongLink", name.length, "L"), padded(name));
      parts.push(header(file.path.slice(0, 99), data.length, "0"));
    } else if (file.via === "pax") {
      const body = `path=${file.path}\n`;
      let record = `${body.length + 3} ${body}`;
      record = `${body.length + String(record.length).length + 1} ${body}`;
      const pax = Buffer.from(record, "utf8");
      parts.push(header("PaxHeader", pax.length, "x"), padded(pax));
      parts.push(header(file.path.slice(0, 99), data.length, "0"));
    } else if (file.via === "prefix") {
      const cut = file.path.lastIndexOf("/");
      parts.push(header(file.path.slice(cut + 1), data.length, "0", file.path.slice(0, cut)));
    } else {
      parts.push(header(file.path, data.length, "0"));
    }
    parts.push(padded(data));
  }
  parts.push(Buffer.alloc(1024));
  return Buffer.concat(parts);
}
