import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function triggerRaycast(
  event,
  extension = process.env.CLAUDE_NOTIFIER_EXTENSION ?? "lee_fulln/claude-raycast-notifier",
  command = "notify-event",
) {
  return triggerRaycastCommand(event, command, extension);
}

export async function triggerRaycastCommand(
  payloadObject,
  command,
  extension = process.env.CLAUDE_NOTIFIER_EXTENSION ?? "lee_fulln/claude-raycast-notifier",
) {
  const payload = Buffer.from(JSON.stringify(payloadObject), "utf8").toString("base64");
  const args = encodeURIComponent(JSON.stringify({ payload }));
  const url = `raycast://extensions/${extension}/${command}?arguments=${args}`;
  await execFileAsync("open", [url]);
}
