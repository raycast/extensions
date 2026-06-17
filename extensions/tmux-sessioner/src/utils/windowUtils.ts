import { ChildProcess, exec, ExecException, execSync } from "child_process";
import { env } from "../config";
import { showHUD, showToast, Toast } from "@raycast/api";
import { openTerminal } from "./terminalUtils";

export interface TmuxWindow {
  sessionName: string;
  windowIndex: number;
  windowName: string;
}

export function getAllWindow(
  callback: (error: ExecException | null, stdout: string, stderr: string) => void,
): ChildProcess {
  return exec('tmux list-windows -aF "#{session_name}:#{window_name}:#{window_index}"', { env }, callback);
}
export async function switchToWindow(window: TmuxWindow, setLoading: (value: boolean) => void) {
  const toast = await showToast({ style: Toast.Style.Animated, title: "" });
  setLoading(true);
  const { sessionName: session, windowIndex, windowName } = window;

  exec(`tmux switch -t ${session}`, { env }, async (error, stdout, stderr) => {
    if (error || stderr) {
      console.error(`exec error: ${error || stderr}`);

      toast.style = Toast.Style.Failure;
      toast.title = "No tmux client found 😢";
      toast.message = error ? error.message : stderr;
      setLoading(false);

      return;
    }
    execSync(`tmux select-window -t ${windowIndex}`, { env });

    try {
      await openTerminal();

      toast.style = Toast.Style.Success;
      toast.title = `Switched to window ${windowName}`;
      await showHUD(`Switched to window ${windowName}`);
      setLoading(false);
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Terminal not supported 😢";
      setLoading(false);
    }
    return;
  });
}

export function renameWindow(
  sessionName: string,
  oldWindowName: string,
  newWindowName: string,
  callback: (error: ExecException | null, stdout: string, stderr: string) => void,
): ChildProcess {
  return exec(`tmux rename-window -t ${sessionName}:${oldWindowName} ${newWindowName}`, { env }, callback);
}

export async function deleteWindow(window: TmuxWindow, setLoading: (value: boolean) => void, callback: () => void) {
  setLoading(true);
  const toast = await showToast({ style: Toast.Style.Animated, title: "" });

  exec(`tmux kill-window -t ${window.sessionName}:${window.windowName}`, { env }, (error, stdout, stderr) => {
    if (error || stderr) {
      console.error(`exec error: ${error || stderr}`);

      toast.style = Toast.Style.Failure;
      toast.title = "Something went wrong 😢";
      toast.message = error ? error.message : stderr;
      setLoading(false);
      return;
    }

    toast.style = Toast.Style.Success;
    toast.title = `Deleted window ${window.windowName}`;
    callback();
    setLoading(false);
  });
}
