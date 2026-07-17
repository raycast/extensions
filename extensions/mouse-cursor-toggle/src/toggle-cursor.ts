import { environment, showHUD } from "@raycast/api";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { mkdir, open, readFile, rm } from "node:fs/promises";
import path from "node:path";

const helperPath = path.join(environment.assetsPath, "cursor-helper");
const statePath = path.join(environment.supportPath, "cursor-helper.state");
const controlPath = `${statePath}.control`;
const errorPath = `${statePath}.error`;
const lockPath = `${statePath}.lock`;

type HelperState = {
  token: string;
  pid?: number;
};

async function removeStaleState(): Promise<void> {
  await Promise.all([
    rm(statePath, { force: true }),
    rm(controlPath, { force: true }),
    rm(errorPath, { force: true }),
    rm(lockPath, { force: true }),
  ]);
}

async function writeToControlChannel(message?: string): Promise<boolean> {
  let channel;

  try {
    channel = await open(
      controlPath,
      constants.O_WRONLY | constants.O_NONBLOCK,
    );
    if (message) await channel.writeFile(message, "utf8");
    return true;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "ENXIO") return false;
    throw error;
  } finally {
    await channel?.close();
  }
}

async function getRunningHelper(): Promise<HelperState | undefined> {
  let rawState: string;

  try {
    rawState = await readFile(statePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }

  const [token, rawPID] = rawState.trim().split(/\s+/, 2);

  if (!token) {
    await removeStaleState();
    return undefined;
  }

  const parsedPID = rawPID ? Number.parseInt(rawPID, 10) : undefined;
  const pid =
    parsedPID !== undefined && Number.isSafeInteger(parsedPID) && parsedPID > 1
      ? parsedPID
      : undefined;

  if (await writeToControlChannel()) return { token, pid };

  await removeStaleState();
  return undefined;
}

async function waitFor(
  predicate: () => Promise<boolean>,
  timeoutMilliseconds = 2_000,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMilliseconds;

  while (Date.now() < deadline) {
    if (await predicate()) return true;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  return false;
}

async function showCursor(helper: HelperState): Promise<void> {
  const stopRequested = await writeToControlChannel(
    `STOP ${helper.token}\n`,
  ).catch(() => false);

  if (stopRequested) {
    const stopped = await waitFor(
      async () => (await getRunningHelper()) === undefined,
    );
    if (stopped) {
      await showHUD("Mouse cursor shown");
      return;
    }
  }

  if (helper.pid) {
    try {
      process.kill(helper.pid, "SIGTERM");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ESRCH") {
        await removeStaleState();
        await showHUD("Mouse cursor shown");
        return;
      }
      throw error;
    }

    const stopped = await waitFor(
      async () => (await getRunningHelper()) === undefined,
    );
    if (stopped) {
      await showHUD("Mouse cursor shown");
      return;
    }
  }

  throw new Error("The cursor helper did not stop in time.");
}

async function hideCursor(): Promise<void> {
  await mkdir(environment.supportPath, { recursive: true });
  await rm(errorPath, { force: true });

  const token = randomUUID();
  const child = spawn(helperPath, [statePath, token], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();

  const started = await waitFor(async () => {
    const helper = await getRunningHelper();
    return helper?.token === token;
  });

  if (!started) {
    let nativeError = "The cursor helper could not start.";
    try {
      nativeError = (await readFile(errorPath, "utf8")).trim();
    } catch {
      // The helper did not leave a more specific startup error.
    }
    throw new Error(nativeError);
  }

  await showHUD("Mouse cursor hidden");
}

export default async function Command() {
  try {
    const runningHelper = await getRunningHelper();

    if (runningHelper) {
      await showCursor(runningHelper);
    } else {
      await hideCursor();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    await showHUD(`Couldn’t toggle cursor: ${message}`);
  }
}
