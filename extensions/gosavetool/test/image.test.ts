// Bundled with esbuild the way `ray build` does, then run in Node: node test/run.mjs
import { readFileSync } from "node:fs";
import { convert, sniff } from "../src/lib/image";

export async function run(dir: string, file: string) {
  const input = new Uint8Array(readFileSync(file));
  const out: string[] = [];
  for (const to of ["webp", "jpg", "png"] as const) {
    const r = await convert(dir, input, to, 75, 64);
    if (sniff(r.data) !== to) throw new Error(to + " output has the wrong signature");
    const back = await convert(dir, r.data, "png", 75);
    if (back.width !== r.width) throw new Error("round trip size");
    out.push(`${r.from}→${to} ${r.width}x${r.height} ${r.data.length} bytes`);
  }
  return out;
}
