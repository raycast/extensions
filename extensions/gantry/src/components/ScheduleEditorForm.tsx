import { useState, useCallback } from "react";
import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  confirmAlert,
  useNavigation,
  Icon,
} from "@raycast/api";
import type { LaunchJob, ScheduleParseResult } from "../lib/types";
import { parseCronSchedule } from "../lib/schedule/parse-cron";
import { parseNaturalSchedule } from "../lib/schedule/parse-natural";
import { parseLLMSchedule } from "../lib/llm/parse-schedule";
import { backupPlist, writeScheduleToPlist } from "../lib/data/plist-writer";
import { reloadService } from "../lib/data/service-reload";
import { getConfig, isLLMConfigured } from "../helpers/preferences";
import { formatRelativeTime } from "../lib/utils/format";

interface ScheduleEditorFormProps {
  job: LaunchJob;
  onRefresh?: () => void;
}

export function ScheduleEditorForm({
  job,
  onRefresh,
}: ScheduleEditorFormProps) {
  const { pop } = useNavigation();
  const [mode, setMode] = useState<string>("cron");
  const [input, setInput] = useState<string>("");
  const [parseResult, setParseResult] = useState<ScheduleParseResult | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasAI = isLLMConfigured();

  const handleInputChange = useCallback(
    (value: string) => {
      setInput(value);

      if (!value.trim()) {
        setParseResult(null);
        return;
      }

      if (mode === "cron") {
        setParseResult(parseCronSchedule(value));
      } else {
        const result = parseNaturalSchedule(value);
        setParseResult(result);
        // If local parsing fails and AI is configured, try AI parsing asynchronously
        if (!result.ok && hasAI) {
          const config = getConfig();
          parseLLMSchedule(config, value).then(setParseResult);
        }
      }
    },
    [mode, hasAI],
  );

  const handleModeChange = useCallback((newMode: string) => {
    setMode(newMode);
    setInput("");
    setParseResult(null);
  }, []);

  async function handleSubmit() {
    if (!parseResult?.ok || !parseResult.schedule) return;

    const confirmed = await confirmAlert({
      title: "Apply Schedule Change?",
      message: `Change schedule from "${job.schedule.humanReadable}" to "${parseResult.humanReadable}"?\n\nPlist: ${job.plistPath}\nA backup will be created.`,
      primaryAction: { title: "Apply" },
    });

    if (!confirmed) return;

    setIsSubmitting(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Applying schedule...",
    });

    try {
      await backupPlist(job.plistPath);
      await writeScheduleToPlist(job.plistPath, parseResult.schedule);
      await reloadService(job.label, job.plistPath);

      toast.style = Toast.Style.Success;
      toast.title = "Schedule updated";
      toast.message = parseResult.humanReadable;

      onRefresh?.();
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to update schedule";
      toast.message = error instanceof Error ? error.message : String(error);
      setIsSubmitting(false);
    }
  }

  const inputError =
    input.trim() && parseResult && !parseResult.ok
      ? parseResult.error
      : undefined;

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle={`Edit Schedule — ${job.label}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Apply Schedule"
            icon={Icon.Check}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Job" text={job.label} />
      <Form.Description
        title="Current Schedule"
        text={job.schedule.humanReadable}
      />
      <Form.Description title="Plist" text={job.plistPath} />

      <Form.Separator />

      <Form.Dropdown
        id="mode"
        title="Input Mode"
        value={mode}
        onChange={handleModeChange}
      >
        <Form.Dropdown.Item value="cron" title="Cron Expression" />
        <Form.Dropdown.Item
          value="natural"
          title={hasAI ? "Natural Language (AI)" : "Natural Language"}
        />
      </Form.Dropdown>

      <Form.TextField
        id="schedule"
        title="Schedule"
        placeholder={mode === "cron" ? "0 9 * * *" : "daily at 9:00 AM"}
        value={input}
        onChange={handleInputChange}
        error={inputError}
      />

      {parseResult?.ok && (
        <>
          <Form.Separator />
          <Form.Description
            title="Preview"
            text={parseResult.humanReadable ?? ""}
          />
          {parseResult.nextRun && (
            <Form.Description
              title="Next Run"
              text={`${formatRelativeTime(parseResult.nextRun)}  (${parseResult.nextRun.toLocaleString()})`}
            />
          )}
        </>
      )}
    </Form>
  );
}
