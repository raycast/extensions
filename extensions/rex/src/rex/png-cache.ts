import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";

interface RgbaImage {
  width: number;
  height: number;
  data: Uint8Array;
}

/** Memoized, atomic PNG writes. Cache failures return undefined so native fallback icons can render. */
export function createPngCache(root: string) {
  const directories = new Set<string>();
  const painted = new Set<string>();
  return (namespace: string, key: string, render: () => RgbaImage): string | undefined => {
    const dir = join(root, namespace);
    const path = join(dir, `${key}.png`);
    if (painted.has(path)) return path;
    const temporary = `${path}.${process.pid}.tmp`;
    try {
      if (!directories.has(dir)) {
        mkdirSync(dir, { recursive: true });
        directories.add(dir);
      }
      if (existsSync(path)) {
        try {
          PNG.sync.read(readFileSync(path));
          painted.add(path);
          return path;
        } catch {
          rmSync(path, { force: true });
        }
      }
      const image = render();
      const png = new PNG({ width: image.width, height: image.height });
      png.data = Buffer.from(image.data.buffer, image.data.byteOffset, image.data.length);
      writeFileSync(temporary, PNG.sync.write(png));
      renameSync(temporary, path);
      painted.add(path);
      return path;
    } catch {
      try {
        rmSync(temporary, { force: true });
      } catch {
        // An unwritable cache must not take down the command.
      }
      return undefined;
    }
  };
}
