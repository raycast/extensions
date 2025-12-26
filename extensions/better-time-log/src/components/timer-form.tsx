import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { StartTimerPayload, TimerMode } from "../lib/timer-store";

interface TimerFormProps {
  onCreate: (payload: StartTimerPayload) => Promise<void> | void;
  autoClose?: boolean;
  initialMode?: TimerMode;
  projects?: string[];
  tags?: string[];
}

export function TimerForm({
  onCreate,
  autoClose = true,
  initialMode = "open",
  projects = [],
  tags = [],
}: TimerFormProps) {
  const { pop } = useNavigation();
  const [mode, setMode] = useState<TimerMode>(initialMode);
  const [customProject, setCustomProject] = useState<string>("");

  const handleSubmit = async (values: Record<string, string | number | undefined>) => {
    const timerMode = (values.mode as TimerMode) || "open";

    // Parse tags from comma-separated string
    const tagsInput = typeof values.tags === "string" ? values.tags : "";
    const parsedTags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const payload: StartTimerPayload = {
      mode: timerMode,
      title: typeof values.title === "string" ? values.title : undefined,
      project: typeof values.project === "string" && values.project !== "" ? values.project : undefined,
      tags: parsedTags.length > 0 ? parsedTags : undefined,
    };

    if (timerMode === "open") {
      const rawMinutes = typeof values.targetDurationMinutes === "string" ? values.targetDurationMinutes.trim() : "";
      if (rawMinutes) {
        const minutes = Number(rawMinutes);
        if (!Number.isFinite(minutes) || minutes <= 0) {
          await showToast({ style: Toast.Style.Failure, title: "Duration must be greater than zero" });
          return;
        }
        payload.targetDurationMinutes = minutes;
      }
    } else {
      const focusMinutes = Number(values.focusMinutes ?? 25);
      const breakMinutes = Number(values.breakMinutes ?? 5);
      const rawCycles = typeof values.cycles === "string" ? values.cycles : `${values.cycles ?? 4}`;
      const parsedCycles = Number(rawCycles);
      const cycles = Number.isFinite(parsedCycles) && parsedCycles > 0 ? Math.round(parsedCycles) : 4;

      if (![focusMinutes, breakMinutes].every((minutes) => Number.isFinite(minutes) && minutes > 0)) {
        await showToast({ style: Toast.Style.Failure, title: "Enter valid Pomodoro lengths" });
        return;
      }

      payload.pomodoro = {
        focusMinutes,
        breakMinutes,
        cycles,
      };
    }

    await onCreate(payload);
    if (autoClose) {
      pop();
    }
  };

  // Combine existing projects with custom typed project
  const allProjects = customProject && !projects.includes(customProject) ? [customProject, ...projects] : projects;

  // Format existing tags as suggestions
  const tagSuggestions =
    tags.length > 0 ? `Existing: ${tags.slice(0, 5).join(", ")}` : "e.g. meeting, coding, research";

  return (
    <Form
      navigationTitle="Start Timer"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Start Timer" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" placeholder="e.g. Sprint Planning" />
      <Form.Dropdown
        id="project"
        title="Project"
        defaultValue=""
        filtering={false}
        onSearchTextChange={setCustomProject}
      >
        <Form.Dropdown.Item title="No Project" value="" />
        {allProjects.map((p) => (
          <Form.Dropdown.Item key={p} title={p} value={p} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="tags"
        title="Tags"
        placeholder={tagSuggestions}
        info="Comma-separated, e.g. meeting, coding"
      />
      <Form.Dropdown id="mode" title="Timer Type" value={mode} onChange={(value) => setMode(value as TimerMode)}>
        <Form.Dropdown.Item title="Open Timer" value="open" />
        <Form.Dropdown.Item title="Pomodoro" value="pomodoro" />
      </Form.Dropdown>

      {mode === "open" && (
        <Form.TextField
          id="targetDurationMinutes"
          title="Target Duration (minutes)"
          placeholder="Leave empty for open timer"
        />
      )}

      {mode === "pomodoro" && (
        <>
          <Form.TextField id="focusMinutes" title="Focus Length (minutes)" defaultValue="25" />
          <Form.TextField id="breakMinutes" title="Break Length (minutes)" defaultValue="5" />
          <Form.TextField id="cycles" title="Focus Blocks" defaultValue="4" />
        </>
      )}
    </Form>
  );
}
