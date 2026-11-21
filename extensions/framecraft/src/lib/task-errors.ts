import { QueueTask } from "./types";

/** Never persist raw execFile errors: their command line may contain access tokens. */
export function describeTaskError(error: unknown, task: QueueTask): string {
  const err = error as { code?: string; stderr?: string; message?: string; killed?: boolean };
  if (err.code === "ENOENT")
    return "FFmpeg or FFprobe not found. Install FFmpeg or set the correct path in the extension preferences.";
  if (err.code === "EACCES" || err.code === "EPERM")
    return "Permission denied reading the video, running a tool, or writing to the save folder. Check the path permissions.";
  if (err.killed)
    return "Processing timed out. Check the direct video link, network speed, and proxy settings, then try again.";
  let detail = String(err.stderr || err.message || "Unknown error");
  for (const secret of [task.config.jellyfinApiKey, task.probe.mediaTarget]) {
    if (secret) detail = detail.split(secret).join("[redacted]");
  }
  detail = detail
    .replace(/https?:\/\/[^\s"'<>]+/gi, "[media URL redacted]")
    .replace(/(?:api_key|token|authorization)\s*[=:]\s*[^\s,;]+/gi, "credentials=[redacted]");
  if (/401|403|Unauthorized|Forbidden/i.test(detail))
    return "The server denied access to the video (401/403). Seeing the playback session doesn't mean the token can read the original file; check your token's permissions.";
  return detail.slice(-1800);
}
