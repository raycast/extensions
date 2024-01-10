import { showToast, Toast } from "@raycast/api";
import type { ChildProcess, ExecException } from "child_process";
import { exec } from "child_process";
import { env } from "./env";

export function listSessions(
  callback: (error: ExecException | null, stdout: string, stderr: string) => void
): ChildProcess {
  return exec(`sesh list`, { env }, callback);
}

export async function connectToSession(session: string, setLoading: (value: boolean) => void) {
  const toast = await showToast({ style: Toast.Style.Animated, title: "" });
  setLoading(true);

  exec(`sesh connect ${session}`, { env }, async (error, _, stderr) => {
    if (error || stderr) {
      toast.style = Toast.Style.Failure;
      toast.title = `🚨 Could not connect to "${session}"`;
      toast.message = error?.message ?? stderr;
    }
    setLoading(false);
  });
}
