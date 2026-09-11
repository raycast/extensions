import { execFile } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";

const run = promisify(execFile);
const apiBaseURL = "http://127.0.0.1:47631/v2";

export async function launchPeople(background = false) {
  // Resolve the installed app even when its URL scheme has not been registered.
  await run("/usr/bin/open", [
    ...(background ? ["-g", "-j"] : []),
    "-b",
    "com.contactsplus.mac",
    ...(background ? [] : ["contactsplus://"]),
  ]);
}

export async function requestPeople(
  path: string,
  accessKey: string,
  signal: AbortSignal,
  launch = () => launchPeople(true),
): Promise<Response> {
  const request = () => {
    signal.throwIfAborted();
    return fetch(`${apiBaseURL}${path}`, {
      signal: AbortSignal.any([signal, AbortSignal.timeout(1000)]),
      cache: "no-store",
      headers: { Authorization: `Bearer ${accessKey}` },
    });
  };

  try {
    // An HTTP error means People is running. Never relaunch for a bad key
    // or a subscription restriction; let the caller show recovery actions.
    return await request();
  } catch {
    signal.throwIfAborted();
  }

  await launch();
  const deadline = Date.now() + 8000;
  for (;;) {
    await delay(250, undefined, { signal });
    try {
      return await request();
    } catch (error) {
      signal.throwIfAborted();
      if (Date.now() >= deadline) throw error;
    }
  }
}
