import { render, showToast, Toast } from "@raycast/api";
import { spawnSync } from "child_process";
import { PipeCommands } from "./pipe-to-command";

function getClipboardContent(): string {
  return spawnSync("pbpaste", { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 }).stdout;
}

async function main() {
  try {
    const content = getClipboardContent();
    render(<PipeCommands input={{ type: "text", content }} />);
  } catch (e: unknown) {
    showToast(Toast.Style.Failure, (e as Error).message);
  }
}

main();
