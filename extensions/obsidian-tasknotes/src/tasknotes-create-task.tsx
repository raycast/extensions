import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  getPreferenceValues,
  closeMainWindow,
  PopToRootType,
} from "@raycast/api";
import { upperFirst, startCase } from "lodash";
import { formatDistanceToNow } from "date-fns";
import { useForm, FormValidation } from "@raycast/utils";
import { getApiUrl, API_ENDPOINTS, getFetchOptions } from "./utils/api";
import { getPriorityIcon, getStatusIcon } from "./utils/helpers";
import { displayDueDate, isFullDayTask } from "./utils/dateUtils";

type Values = {
  taskTitle: string;
  priority?: string;
  status?: string;
  due?: Date | null;
  scheduled?: Date | null;
  tags?: string;
  projects?: string;
  contexts?: string;
  details?: string;
  timeEstimate?: string; // captured from text field, parse to number
};

export default function Command() {
  const preferences = getPreferenceValues<{
    port: string;
    AuthToken?: string;
    defaultStatus?: string;
    defaultContexts?: string;
    defaultTags?: string;
  }>();
  const { port, AuthToken, defaultStatus, defaultContexts, defaultTags } = preferences;

  const { itemProps, handleSubmit, setValue, focus } = useForm<Values>({
    initialValues: {
      taskTitle: "",
      priority: "normal",
      status: defaultStatus || "open",
      due: null,
      scheduled: null,
      tags: defaultTags || "",
      projects: "",
      contexts: defaultContexts || "",
      details: "",
      timeEstimate: "",
    } as Values,
    validation: {
      taskTitle: FormValidation.Required,
    },
    async onSubmit(values) {
      // build payload
      const title = values.taskTitle?.trim();
      if (!title) {
        await showToast({ style: Toast.Style.Failure, title: "Title required", message: "Please enter a title." });
        return;
      }
      if (title.length > 200) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Title too long",
          message: "Title must be 200 characters or fewer.",
        });
        return;
      }

      const formatDateOrDateTime = (d?: Date | null) => {
        if (!d) return undefined;
        try {
          if (Form.DatePicker.isFullDay(d)) {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            return `${y}-${m}-${day}`;
          }
        } catch {
          if (d && d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0 && d.getMilliseconds() === 0) {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            return `${y}-${m}-${day}`;
          }
        }
        return (d as Date).toISOString();
      };

      const payload: Record<string, unknown> = {
        title,
      };

      if (values.priority) payload.priority = values.priority;
      if (values.status) payload.status = values.status;
      if (values.due) payload.due = formatDateOrDateTime(values.due);
      if (values.scheduled) payload.scheduled = formatDateOrDateTime(values.scheduled);

      if (values.tags) {
        const parsed = (values.tags as unknown as string)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (parsed.length) payload.tags = parsed;
      }
      if (values.projects) {
        const parsed = (values.projects as unknown as string)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (parsed.length) payload.projects = parsed;
      }
      if (values.contexts) {
        const parsed = (values.contexts as unknown as string)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (parsed.length) payload.contexts = parsed;
      }
      if (values.details) payload.details = values.details;
      if (values.timeEstimate) {
        const n = parseInt(values.timeEstimate as string, 10);
        if (!Number.isNaN(n)) payload.timeEstimate = n;
      }

      try {
        const res = await fetch(getApiUrl(port, API_ENDPOINTS.tasks), getFetchOptions("POST", payload, AuthToken));

        if (res.ok) {
          // Format success message with due date if present (same format as quick-add-task)
          const dueDateString = values.due ? formatDateOrDateTime(values.due) : undefined;
          const friendlyDate = dueDateString
            ? isFullDayTask(dueDateString)
              ? displayDueDate(dueDateString)
              : formatDistanceToNow(new Date(dueDateString), { addSuffix: true })
            : null;
          const text = friendlyDate ? `${title} | ${friendlyDate}` : title;
          await showToast({ style: Toast.Style.Success, title: `Task created: ${text}` });

          // Clear fields and reset to defaults (same pattern used in your reminders example)
          setValue("taskTitle", "");
          setValue("priority", "normal");
          setValue("status", defaultStatus || "open");
          setValue("due", null);
          setValue("scheduled", null);
          setValue("tags", defaultTags || "");
          setValue("projects", "");
          setValue("contexts", defaultContexts || "");
          setValue("details", "");
          setValue("timeEstimate", "");
          focus("taskTitle");
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
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {/* Create and New — keep window open, call handleSubmit directly */}
            <Action.SubmitForm title="Create and New" onSubmit={handleSubmit} />
            {/* Create Task — submit first, show toast, then close window */}
            <Action.SubmitForm
              title="Create Task"
              onSubmit={async (values) => {
                const title = (values.taskTitle as string)?.trim();
                if (!title) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Title required",
                    message: "Please enter a title.",
                  });
                  return;
                }
                if (title.length > 200) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Title too long",
                    message: "Title must be 200 characters or fewer.",
                  });
                  return;
                }

                const formatDateOrDateTime = (d?: Date | null) => {
                  if (!d) return undefined;
                  try {
                    if (Form.DatePicker.isFullDay(d)) {
                      const y = d.getFullYear();
                      const m = String(d.getMonth() + 1).padStart(2, "0");
                      const day = String(d.getDate()).padStart(2, "0");
                      return `${y}-${m}-${day}`;
                    }
                  } catch {
                    if (
                      d &&
                      d.getHours() === 0 &&
                      d.getMinutes() === 0 &&
                      d.getSeconds() === 0 &&
                      d.getMilliseconds() === 0
                    ) {
                      const y = d.getFullYear();
                      const m = String(d.getMonth() + 1).padStart(2, "0");
                      const day = String(d.getDate()).padStart(2, "0");
                      return `${y}-${m}-${day}`;
                    }
                  }
                  return (d as Date).toISOString();
                };

                const payload: Record<string, unknown> = {
                  title,
                };

                if (values.priority) payload.priority = values.priority;
                if (values.status) payload.status = values.status;
                if (values.due) payload.due = formatDateOrDateTime(values.due);
                if (values.scheduled) payload.scheduled = formatDateOrDateTime(values.scheduled);

                if (values.tags) {
                  const parsed = (values.tags as unknown as string)
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean);
                  if (parsed.length) payload.tags = parsed;
                }
                if (values.projects) {
                  const parsed = (values.projects as unknown as string)
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean);
                  if (parsed.length) payload.projects = parsed;
                }
                if (values.contexts) {
                  const parsed = (values.contexts as unknown as string)
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean);
                  if (parsed.length) payload.contexts = parsed;
                }
                if (values.details) payload.details = values.details;
                if (values.timeEstimate) {
                  const n = parseInt(values.timeEstimate as string, 10);
                  if (!Number.isNaN(n)) payload.timeEstimate = n;
                }

                try {
                  const res = await fetch(
                    getApiUrl(port, API_ENDPOINTS.tasks),
                    getFetchOptions("POST", payload, AuthToken),
                  );

                  if (res.ok) {
                    // Format success message with due date if present (same format as quick-add-task)
                    const dueDateString = values.due ? formatDateOrDateTime(values.due) : undefined;
                    const friendlyDate = dueDateString
                      ? isFullDayTask(dueDateString)
                        ? displayDueDate(dueDateString)
                        : formatDistanceToNow(new Date(dueDateString), { addSuffix: true })
                      : null;
                    const text = friendlyDate ? `${title} | ${friendlyDate}` : title;

                    // Close window first, then show toast (like quick-add-task does)
                    await closeMainWindow({ popToRootType: PopToRootType.Immediate });
                    await showToast({ style: Toast.Style.Success, title: `Task created: ${text}` });
                  } else {
                    const errorText = await res.text();
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Failed to create task",
                      message: `${res.status} ${res.statusText}${errorText ? ` - ${errorText}` : ""}`,
                    });
                  }
                } catch (error: unknown) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Network error",
                    message: error instanceof Error ? error.message : String(error),
                  });
                }
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextField {...itemProps.taskTitle} title="Title" placeholder="New task title" />

      <Form.Dropdown {...itemProps.priority} title="Priority">
        {(["none", "high", "normal", "low"] as const).map((priority) => (
          <Form.Dropdown.Item
            key={priority}
            value={priority}
            title={upperFirst(priority)}
            icon={getPriorityIcon(priority)}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown {...itemProps.status} title="Status">
        {(["none", "open", "in-progress", "done"] as const).map((status) => (
          <Form.Dropdown.Item key={status} value={status} title={startCase(status)} icon={getStatusIcon(status)} />
        ))}
      </Form.Dropdown>

      <Form.DatePicker {...itemProps.due} title="Due date and time" />
      <Form.DatePicker {...itemProps.scheduled} title="Scheduled date and time" />

      <Form.TextField {...itemProps.tags} title="Tags" placeholder="Comma-separated tags (e.g. email, urgent)" />
      <Form.TextField
        {...itemProps.projects}
        title="Projects"
        placeholder="Comma-separated projects (e.g. [[Work Project]])"
      />
      <Form.TextField
        {...itemProps.contexts}
        title="Contexts"
        placeholder="Comma-separated contexts (e.g. @computer)"
      />

      <Form.TextArea {...itemProps.details} title="Details" placeholder="Additional task description" />

      <Form.TextField {...itemProps.timeEstimate} title="Time estimate (minutes)" placeholder="60" />

      <Form.Separator />
    </Form>
  );
}
