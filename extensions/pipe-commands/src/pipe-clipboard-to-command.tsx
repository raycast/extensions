import { showToast, Toast } from "@raycast/api";
import { spawnSync } from "child_process";
import { PipeCommands } from "./pipe-to-command";

function getClipboardContent(): string {
  return spawnSync("pbpaste", { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 }).stdout;
}

export default function PipeClipboardToCommand() {
  try {
  const content = getClipboardContent()
  return <PipeCommands input={{ type: "text", content }} />;
  } catch (e: unknown) {
    showToast(Toast.Style.Failure, (e as Error).message);
  }
}

