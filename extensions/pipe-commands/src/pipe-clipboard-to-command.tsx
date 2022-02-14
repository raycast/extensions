import { showToast, Toast } from "@raycast/api";
import { spawnSync } from "child_process";
import { existsSync } from "fs";
import { PipeCommands, PipeInput } from "./pipe-to-command";

const applescript = `
if ((clipboard info) as string) contains "«class furl»" then
    set output to (POSIX path of (the clipboard as «class furl»))
else
    set output to the clipboard
end if
`;

function getClipboardContent(): PipeInput {
  const content = spawnSync("osascript", ["-e", applescript], {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  }).stdout.trim();
  const type = existsSync(content) ? "file" : "text";
  return { type, content };
}

export default function PipeClipboardToCommand() {
  try {
    const input = getClipboardContent();
    return <PipeCommands input={input} />;
  } catch (e: unknown) {
    showToast(Toast.Style.Failure, (e as Error).message);
  }
}
