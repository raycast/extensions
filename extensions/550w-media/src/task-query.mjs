export function taskQuery(action, result, suppliedId = "") {
  if (
    result.code !== 200 ||
    !["image", "video", "image_query", "video_query"].includes(action)
  )
    return undefined;
  const taskId =
    (action.startsWith("image") ? result.task?.taskId : result.taskId) ??
    result.taskId ??
    suppliedId.trim();
  if (typeof taskId !== "string" || !taskId.trim() || taskId.length > 128)
    return undefined;
  return {
    endpoint: action.startsWith("image")
      ? "imageWatermarkTaskDetail"
      : "taskDetail",
    taskId,
  };
}
