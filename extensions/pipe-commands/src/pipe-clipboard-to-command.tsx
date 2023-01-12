import { showToast, Toast } from "@raycast/api";
import { spawnSync } from "child_process";
import { existsSync } from "fs";
import { PipeCommands, PipeInput } from "./pipe-to-command";

const applescript = `
set clipboardType to (item 1 of (item 1 of (clipboard info)) as string)
if (clipboardType = "«class furl»") then
    set output to (POSIX path of (the clipboard as «class furl»))
else if (clipboardType = "«class utf8»") then
    set output to the clipboard
else
    tell me to error "Unsupported clipboard type: " & clipboardType
end if
`;

function getClipboardContent(): PipeInput {
  const content = spawnSync("osascript", ["-e", applescript], {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  }).stdout.trim();
  const type = existsSync(content) ? "file" : "text";
  return { type, content, origin: "clipboard" };
}

export default function PipeClipboardToCommand() {
  try {
    const input = getClipboardContent();
    return <PipeCommands input={input} />;
  } catch (e: unknown) {
    showToast(Toast.Style.Failure, (e as Error).message);
  }
}
