import { authToken } from "./preference";
import childProcess from "node:child_process";

interface openOptions {
  background?: boolean;
}

async function open(url: string, options?: openOptions) {
  const args = [];

  if (options?.background) args.push("--background");
  args.push(url);

  const process = childProcess.spawn("open", args);

  process.unref();

  return process;
}

export async function write(
  value: { name: string; text: string },
  callback: (success: boolean, message?: string) => void,
) {
  const token = authToken();
  if (!token) callback(false, "Auth Token is unset. Please configure auth token first.");
  try {
    const url = [
      `ia-writer://x-callback-url/write?`,
      `auth-token=${authToken()}&`,
      `path=${value.name}.md&`,
      `text=${encodeURIComponent(value.text)}`,
    ].join("");
    await open(url, { background: true });
    if (callback) callback(true);
  } catch (error) {
    if (callback) callback(false, error!.toString());
    else console.error(error);
  }
}

export async function search(value: string, callback?: (success: boolean, message?: string) => void) {
  try {
    const url = `ia-writer://x-callback-url/quick-search?query=${value}`;
    await open(url);
    if (callback) callback(true);
  } catch (error) {
    if (callback) callback(false, error!.toString());
    else console.error(error);
  }
}
