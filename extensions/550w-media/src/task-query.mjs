export async function refreshTaskResult(
  action,
  query,
  operation,
  auth,
  request,
) {
  const result = await (query
    ? request(query.endpoint, auth, { taskId: query.taskId })
    : request("receipt", auth, { operationId: operation }));
  return { result, query: query ?? taskQuery(action, result) };
}

export function taskQuery(action, result, suppliedId = "") {
  if (action === "receipt_query") {
    if (!["image", "video"].includes(result?.kind)) return undefined;
    action = result.kind;
    suppliedId = "";
  }
  if (
    result?.code !== 200 ||
    !["image", "video", "image_query", "video_query"].includes(action)
  )
    return undefined;
  const taskId =
    (action.startsWith("image") ? result.task?.taskId : result.taskId) ??
    result.taskId ??
    suppliedId.trim();
  if (typeof taskId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(taskId))
    return undefined;
  return {
    endpoint: action.startsWith("image")
      ? "imageWatermarkTaskDetail"
      : "taskDetail",
    taskId,
  };
}
