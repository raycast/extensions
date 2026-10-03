import { publicUrl } from "./generated/api.mjs";

// Only consume documented result fields, never original/upload/thumbnail URLs.
export function resultSummary(action, result, fallbackId = "") {
  const data = action.startsWith("image")
    ? (result?.task ?? result ?? {})
    : (result ?? {});
  const accepted = result?.code === 200;
  const taskId = data.taskId ?? fallbackId;
  let status = accepted ? (data.status ?? "unknown") : "rejected";
  if (status === "accepted") status = "waiting";
  let url;
  const candidate =
    action === "share" || action === "receipt_query"
      ? (result?.data?.video ?? data.resultUrl)
      : data.resultUrl;
  if (
    accepted &&
    (action === "share" || status === "success") &&
    typeof candidate === "string"
  ) {
    try {
      url = publicUrl(candidate);
    } catch {
      /* Invalid result links are never actionable. */
    }
  }
  if (action === "share" && accepted) status = url ? "success" : "unknown";
  return {
    status,
    taskId: typeof taskId === "string" && taskId.trim() ? taskId : undefined,
    failure:
      status === "failed" || status === "rejected"
        ? String(
            data.failReason ||
              result?.message ||
              "No failure details available",
          )
        : undefined,
    url,
  };
}
