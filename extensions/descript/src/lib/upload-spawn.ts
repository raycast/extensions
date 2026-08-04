import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import { statusFilePathFor } from "./upload-tracker";

/** RFC 2045 type/subtype tokens only — safe to pass through bash to curl. */
const SAFE_CONTENT_TYPE = /^[\w!#$&^_.+-]+\/[\w!#$&^_.+-]+$/;

export function sanitizeContentTypeForShell(contentType: string): string {
  const trimmed = contentType.trim();
  return SAFE_CONTENT_TYPE.test(trimmed) ? trimmed : "application/octet-stream";
}

/**
 * Inline bash script that uploads one file via curl, writing structured
 * status JSON to a sibling file as it progresses. Designed to be spawned
 * detached so the upload survives Raycast dismissal.
 *
 * The signed upload URL arrives via the DESCRIPT_UPLOAD_URL env var rather
 * than argv: argv is world-readable in \`ps\`, and while the URL is
 * time-limited there's no reason to expose it to other local processes.
 *
 * Args (positional, after the implicit $0):
 *   $1 — local file path
 *   $2 — destination status file path
 *   $3 — Content-Type for the PUT (must match the type declared when the
 *        signed URL was requested, or signed-header checks can reject it)
 */
const UPLOAD_SCRIPT = `set -u
URL="$DESCRIPT_UPLOAD_URL"
unset DESCRIPT_UPLOAD_URL
FILE="$1"
STATUS_FILE="$2"
CONTENT_TYPE="\${3:-application/octet-stream}"

mkdir -p "$(dirname "$STATUS_FILE")"

SIZE=$(stat -f%z "$FILE" 2>/dev/null || echo 0)
START=$(date +%s)
printf '{"status":"uploading","fileSize":%s,"startedAt":%s}' "$SIZE" "$START" > "$STATUS_FILE"

HTTP_CODE=$(curl -X PUT \\
  -H "Content-Type: $CONTENT_TYPE" \\
  --upload-file "$FILE" \\
  -o /dev/null \\
  -s \\
  -w "%{http_code}" \\
  --max-time 7200 \\
  "$URL")
CURL_EXIT=$?
END=$(date +%s)

# Normalize HTTP_CODE before embedding it in JSON: curl may emit "" (no
# response at all) or "000" (response started but no status). The base-10
# coercion drops the leading zeros that would otherwise make the status
# file invalid JSON and leave the upload stuck at "uploading" forever.
if [ -z "$HTTP_CODE" ]; then HTTP_CODE=0; fi
HTTP_CODE=$((10#$HTTP_CODE))

if [ $CURL_EXIT -eq 0 ] && [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
  printf '{"status":"done","httpCode":%s,"finishedAt":%s}' "$HTTP_CODE" "$END" > "$STATUS_FILE"
  exit 0
else
  printf '{"status":"failed","httpCode":%s,"curlExit":%s,"finishedAt":%s}' "$HTTP_CODE" "$CURL_EXIT" "$END" > "$STATUS_FILE"
  exit 1
fi
`;

export type SpawnUploadInput = {
  jobId: string;
  fileName: string;
  filePath: string;
  signedUrl: string;
  /** MIME type declared to Descript when the signed URL was requested. */
  contentType: string;
};

export async function spawnDetachedUpload(input: SpawnUploadInput): Promise<{ statusFilePath: string; pid?: number }> {
  const statusFilePath = statusFilePathFor(input.jobId, input.fileName);
  await mkdir(dirname(statusFilePath), { recursive: true });

  const contentType = sanitizeContentTypeForShell(input.contentType);

  const child = spawn("bash", ["-c", UPLOAD_SCRIPT, "descript-uploader", input.filePath, statusFilePath, contentType], {
    detached: true,
    stdio: "ignore",
    env: { ...process.env, DESCRIPT_UPLOAD_URL: input.signedUrl },
  });
  child.unref();

  // `detached: true` makes the child a process-group leader, so this pid can
  // be used with `process.kill(-pid)` to stop bash *and* its curl child.
  return { statusFilePath, pid: child.pid };
}
