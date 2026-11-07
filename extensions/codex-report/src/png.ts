import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { copyFile, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);
export type SvgImage = { body: string; width: number; height: number };

/** Quick Look renders a square thumbnail; center the card before cropping it. */
export async function savePng(image: SvgImage, destination: string): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), "codex-report-export-"));
  try {
    const size = Math.max(image.width, image.height);
    const source = join(directory, "report.svg");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><g transform="translate(${(size - image.width) / 2},${(size - image.height) / 2})">${image.body}</g></svg>`;
    await writeFile(source, svg);
    await exec("/usr/bin/qlmanage", ["-t", "-s", String(size * 2), "-o", directory, source], { timeout: 20_000 });
    const cropped = join(directory, "report.png");
    await exec(
      "/usr/bin/sips",
      ["-c", String(image.height * 2), String(image.width * 2), `${source}.png`, "--out", cropped],
      { timeout: 20_000 },
    );
    await copyFile(cropped, destination, constants.COPYFILE_EXCL);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
