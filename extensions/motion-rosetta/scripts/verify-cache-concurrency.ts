import { mkdtemp, writeFile, readdir, stat, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import {
  PreviewCache,
  MAX_BYTES,
  MAX_FILES,
} from "../src/lib/preview-cache.ts";
import { fromDuration } from "../src/lib/model.ts";

async function main() {
  if (process.argv[2] === "worker") {
    const cache = new PreviewCache(process.argv[3]);
    for (let i = 0; i < 12; i++) {
      await cache.get({
        easing: fromDuration(0.5, 0.3),
        duration: Number(process.argv[4]) + i / 100,
        component: "Toggle",
        appearance: "dark",
      });
    }
  } else {
    const directory = await mkdtemp(join(tmpdir(), "rosetta-process-cache-"));
    try {
      for (let i = 0; i < 190; i++)
        await writeFile(
          join(directory, `${i.toString(16).padStart(64, "0")}.gif`),
          new Uint8Array(100 * 1024),
        );
      await Promise.all(
        [1, 2, 3, 4].map(
          (offset) =>
            new Promise<void>((resolve, reject) => {
              const child = spawn(
                process.execPath,
                [
                  "--experimental-strip-types",
                  process.argv[1],
                  "worker",
                  directory,
                  String(offset),
                ],
                { stdio: ["ignore", "ignore", "pipe"] },
              );
              let error = "";
              child.stderr.on("data", (data) => {
                error += String(data);
              });
              child.on("error", reject);
              child.on("exit", (code) =>
                code === 0 ? resolve() : reject(new Error(error)),
              );
            }),
        ),
      );
      const names = await readdir(directory);
      const gifs = names.filter((name) => /^[a-f0-9]{64}\.gif$/.test(name));
      const sizes = await Promise.all(
        gifs.map((name) => stat(join(directory, name))),
      );
      const bytes = sizes.reduce((sum, info) => sum + info.size, 0);
      if (
        gifs.length > MAX_FILES ||
        bytes > MAX_BYTES ||
        (await readdir(join(directory, ".admission-v2"))).length > 0
      )
        throw new Error(
          `Cache exceeded limits: ${gifs.length} GIFs, ${bytes} bytes`,
        );
      console.log(
        `Four independent processes passed: ${gifs.length} GIFs, ${bytes} bytes; lock released.`,
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
