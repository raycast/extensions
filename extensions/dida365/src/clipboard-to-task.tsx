import { Action, ActionPanel, Clipboard, Form, Keyboard, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { createTask, describeApiError, listProjects } from "./api/dida365.js";
import { PriorityDropdown, ProjectDropdown } from "./components/form-fields.js";
import { SetupTokenView } from "./components/setup-token-view.js";
import { isMissingApiToken } from "./setup.js";
import type { Project, TaskPriority } from "./types.js";
import { parseSmartDate, stripSmartDateText, toTaskDatePayload } from "./utils/smart-date.js";
import { didaTimeZone } from "./utils/timezone.js";

type Values = {
  tasksText: string;
  projectId?: string;
  priority: string;
};

type ParsedClipboardTask = {
  title: string;
  source: string;
  dueDate?: string;
  isAllDay?: boolean;
};

export default function Command() {
  const { pop } = useNavigation();
  const [clipboardText, setClipboardText] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const [text, loadedProjects] = await Promise.all([Clipboard.readText(), listProjects()]);
        setClipboardText(text ?? "");
        setProjects(loadedProjects);
      } catch (error) {
        if (isMissingApiToken(error)) {
          setNeedsSetup(true);
          return;
        }

        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load clipboard",
          message: describeApiError(error),
        });
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, []);

  const preview = useMemo(() => parseClipboardTasks(clipboardText), [clipboardText]);

  if (needsSetup) {
    return <SetupTokenView />;
  }

  async function handleSubmit(values: Values) {
    const parsedTasks = parseClipboardTasks(values.tasksText);

    if (parsedTasks.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No tasks found",
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Creating ${parsedTasks.length} task${parsedTasks.length > 1 ? "s" : ""}...`,
    });

    try {
      const timeZone = didaTimeZone();
      const results = await Promise.allSettled(
        parsedTasks.map((task) =>
          createTask({
            title: task.title,
            projectId: values.projectId || undefined,
            content: task.source,
            dueDate: task.dueDate,
            isAllDay: task.isAllDay,
            priority: Number(values.priority) as TaskPriority,
            timeZone,
          }),
        ),
      );
      const succeeded = results.filter((result) => result.status === "fulfilled").length;
      const failed = results.length - succeeded;

      if (failed > 0) {
        toast.style = Toast.Style.Failure;
        toast.title = `Created ${succeeded}, failed ${failed}`;
        toast.message = firstRejectionMessage(results);

        if (succeeded > 0) {
          pop();
        }

        return;
      }

      toast.style = Toast.Style.Success;
      toast.title = `Created ${succeeded} task${succeeded > 1 ? "s" : ""}`;
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create tasks";
      toast.message = describeApiError(error);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Tasks" shortcut={Keyboard.Shortcut.Common.Save} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="tasksText"
        title="Clipboard Tasks"
        defaultValue={clipboardText}
        placeholder="One task per line. Example: 明天上午9点 提交报告"
      />

      <Form.Description
        title="Preview"
        text={preview
          .slice(0, 8)
          .map((task) => `• ${task.title}${task.dueDate ? ` · ${task.dueDate}` : ""}`)
          .join("\n")}
      />

      <ProjectDropdown projects={projects} />
      <PriorityDropdown />
    </Form>
  );
}

function firstRejectionMessage(results: PromiseSettledResult<unknown>[]): string | undefined {
  const rejected = results.find((result) => result.status === "rejected");
  return rejected ? describeApiError(rejected.reason) : undefined;
}

function parseClipboardTasks(text: string): ParsedClipboardTask[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*•\d.)\s]+/, "").trim())
    .filter(Boolean)
    .map((source) => {
      const smartDate = parseSmartDate(source);
      const payload = toTaskDatePayload(smartDate);
      const title = stripSmartDateText(source, smartDate) || source;

      return {
        title: title.slice(0, 220),
        source,
        dueDate: payload.dueDate,
        isAllDay: payload.isAllDay,
      };
    });
}
