import { environment, showToast, Toast } from "@raycast/api";
import { AsyncState, useCachedPromise } from "@raycast/utils";
import { execFile } from "child_process";
import { createWriteStream } from "fs";
import { unlink } from "fs/promises";
import fetch from "node-fetch";
import * as path from "path";
import { finished } from "stream/promises";
import { promisify } from "util";

const noop = () => {};
const execAsync = promisify(execFile);
const unlinkSilent = (p: string) => unlink(p).catch(noop);

const JQ_VERSION = "jq-1.7.1";
const jqUrl = `https://github.com/jqlang/jq/releases/download/${JQ_VERSION}/jq-macos-amd64`;

export const JQ_EXEC = path.join(environment.supportPath, "jq");

async function downloadJq(jqPath: string): Promise<void> {
  await unlinkSilent(jqPath);
  const res = await fetch(jqUrl, { redirect: "follow" });
  if (!res.ok || !res.body) {
    throw new Error(`Failed to download jq: ${res.statusText}`);
  }

  const fileStream = createWriteStream(jqPath, { flags: "w", mode: 0o755 });
  try {
    return await finished(res.body.pipe(fileStream), {});
  } catch (err) {
    await unlinkSilent(jqPath);
    throw err;
  }
}

export async function ensureJq(jqPath: string, download: boolean = true): Promise<string> {
  try {
    // TODO: merge with logic within command into useJq hook
    const { stdout } = await execAsync(jqPath, ["-V"]);
    return stdout;
  } catch (error) {
    if (!download) {
      throw error;
    }

    await downloadJq(jqPath);
    return await ensureJq(jqPath, /* download= */ false);
  }
}

export function useJq(): AsyncState<string> {
  return useCachedPromise(async () => {
    const toast = await showToast({
      title: "Checking if jq is available",
      style: Toast.Style.Animated,
    });

    try {
      const version = await ensureJq(JQ_EXEC);
      toast.style = Toast.Style.Success;
      toast.title = "Found";
      toast.message = version;
      setTimeout(() => toast.hide(), 1000);
      return JQ_EXEC;
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.message = String(err);
      throw err;
    }
  }, []);
}
