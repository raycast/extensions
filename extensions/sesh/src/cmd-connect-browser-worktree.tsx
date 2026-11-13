import { showHUD, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { connectToBrowserWorktree } from "./sesh";
import { checkSetup } from "./setup";
import { openApp } from "./app";

export default async function ConnectBrowserWorktreeCommand() {
  try {
    await showToast({ style: Toast.Style.Animated, title: "Connecting to worktree…" });
    await checkSetup();
    await connectToBrowserWorktree();
    await openApp();
    await showHUD("Connected to worktree");
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't connect to worktree" });
  }
}
