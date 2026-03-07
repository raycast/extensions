import { showToast, Toast, LaunchProps, getPreferenceValues, closeMainWindow } from "@raycast/api";
import { formatDistanceToNow } from "date-fns";
import { getApiUrl, API_ENDPOINTS, getFetchOptions } from "./utils/api";
import { displayDueDate, isFullDayTask } from "./utils/dateUtils";

export default async function Command(props: LaunchProps) {
  const task = props.arguments?.task?.trim();

  if (!task) {
    await showToast({ style: Toast.Style.Failure, title: "Task required", message: "Please provide a task." });
    return;
  }

  await showToast({ style: Toast.Style.Animated, title: "Creating task..." });

  const { defaultLocale, port, AuthToken, defaultStatus, defaultContexts, defaultTags } = getPreferenceValues<{
    defaultLocale: string;
    port: string;
    AuthToken?: string;
    defaultStatus?: string;
    defaultContexts?: string;
    defaultTags?: string;
  }>();

  try {
    // Step 1: Parse the user's natural language input
    const parseRes = await fetch(
      getApiUrl(port, API_ENDPOINTS.nlpParse),
      getFetchOptions("POST", { text: task, locale: defaultLocale }, AuthToken),
    );

    if (!parseRes.ok) {
      throw new Error(`Parse failed: ${parseRes.status} ${parseRes.statusText}`);
    }

    const parseResponse = await parseRes.json();
    if (!parseResponse.success) {
      throw new Error(parseResponse.error?.message || "Parse operation failed");
    }

    const parsed = parseResponse.data.parsed;
    const taskData = parseResponse.data.taskData;

    // Step 2: Apply defaults to missing fields
    const enhancedTaskData = { ...taskData };

    // Apply default status if not specified or if parsed as "todo" (convert to "open")
    if (!parsed.status || parsed.status === "todo") {
      if (defaultStatus && defaultStatus.trim()) {
        enhancedTaskData.status = defaultStatus;
      } else {
        enhancedTaskData.status = "open"; // Default to "open"
      }
    }

    // Apply default contexts if none specified
    if (!parsed.contexts || parsed.contexts.length === 0) {
      if (defaultContexts && defaultContexts.trim()) {
        const contexts = defaultContexts
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean);
        enhancedTaskData.contexts = contexts;
      }
    }

    // Apply default tags if none specified
    if (!parsed.tags || parsed.tags.length === 0) {
      if (defaultTags && defaultTags.trim()) {
        const tags = defaultTags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
        enhancedTaskData.tags = tags;
      }
    }

    // Step 3: Create the task with enhanced data
    const res = await fetch(getApiUrl(port, API_ENDPOINTS.tasks), getFetchOptions("POST", enhancedTaskData, AuthToken));

    if (res.ok) {
      await closeMainWindow();
      const friendlyDate = enhancedTaskData.due
        ? isFullDayTask(enhancedTaskData.due)
          ? displayDueDate(enhancedTaskData.due)
          : formatDistanceToNow(enhancedTaskData.due, { addSuffix: true })
        : null;
      const text = friendlyDate ? `${enhancedTaskData.title} | ${friendlyDate}` : enhancedTaskData.title;
      await showToast({ style: Toast.Style.Success, title: `Task created: ${text}` });
    } else {
      const text = await res.text();
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create task",
        message: `${res.status} ${res.statusText}${text ? ` - ${text}` : ""}`,
      });
    }
  } catch (error: unknown) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Network error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
