import { execFile } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { getLogoURL, parseDomain } from "./domains";
import { createError } from "./errors";

const run = promisify(execFile);
const cacheAge = 7 * 24 * 60 * 60 * 1000;

/** Download and normalize to PNG; cache successful images for seven days. */
export async function getLogoFile({
  domain,
  cachePath,
}: {
  domain: string;
  cachePath: string;
}): Promise<string> {
  if (parseDomain(domain) !== domain) {
    throw createError({
      status: 400,
      message: "Invalid website domain",
      why: "A bare public hostname is required",
      fix: "Enter a domain such as stripe.com",
    });
  }
  await mkdir(cachePath, { recursive: true });
  const destination = join(cachePath, `${domain}.png`);
  try {
    const cached = await stat(destination);
    if (cached.size > 0 && Date.now() - cached.mtimeMs < cacheAge) {
      return destination;
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw createError({
        status: 500,
        message: "Cannot read logo cache",
        why: String(error),
        fix: "Check the extension cache folder permissions",
      });
    }
  }

  const temporary = await mkdtemp(join(cachePath, ".download-"));
  try {
    const response = await fetch(getLogoURL(domain), {
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      throw createError({
        status: response.status,
        message: "Logo unavailable",
        why: `Google returned HTTP ${response.status}`,
        fix: "Check the domain or try again later",
      });
    }
    if (!response.headers.get("content-type")?.startsWith("image/")) {
      throw createError({
        status: 502,
        message: "Logo response is not an image",
        why: "Google returned an unexpected content type",
        fix: "Try again when the favicon service is available",
      });
    }
    const input = join(temporary, "original");
    const output = join(temporary, "logo.png");
    await writeFile(input, Buffer.from(await response.arrayBuffer()));
    // Favicons can be ICO files. Normalize with macOS before placing them on the clipboard.
    await run(
      "/usr/bin/sips",
      ["-s", "format", "png", input, "--out", output],
      { timeout: 10_000 },
    );
    const png = await readFile(output);
    if (
      !png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    ) {
      throw createError({
        status: 502,
        message: "Cannot decode this logo",
        why: "Image conversion did not produce a PNG",
        fix: "Try another company domain",
      });
    }
    await rename(output, destination);
    return destination;
  } catch (error) {
    if (error instanceof Error && "fix" in error) {
      throw error;
    }
    throw createError({
      status: 502,
      message: "Could not download logo",
      why: String(error),
      fix: "Check your connection and try again",
    });
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}
