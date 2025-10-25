import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  openExtensionPreferences,
  Detail,
  Clipboard,
} from "@raycast/api";
import { useState } from "react";
import { getCompletedTodayTasks, getAllTasks } from "./notionClient";
import { generateTaskSummary, isAIEnabled, TaskSummaryOptions } from "./aiHelper";
import { startOfWeek, startOfMonth } from "date-fns";

function SummaryForm({ onGenerate }: { onGenerate: (options: TaskSummaryOptions) => void }) {
  const [period, setPeriod] = useState<"day" | "week" | "month">("day");
  const [format, setFormat] = useState<"standup" | "detailed" | "bullet">("standup");

  function handlePeriodChange(value: string) {
    setPeriod(value as "day" | "week" | "month");
  }

  function handleFormatChange(value: string) {
    setFormat(value as "standup" | "detailed" | "bullet");
  }

  async function handleSubmit() {
    if (!isAIEnabled()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "AI not available",
        message: "Please enable Raycast Pro or add OpenAI API key in settings",
        primaryAction: {
          title: "Open Settings",
          onAction: async () => {
            await openExtensionPreferences();
          },
        },
      });
      return;
    }

    onGenerate({ period, format });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Summary" icon={Icon.Wand} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="🤖 AI Task Summary" text="Generate professional summaries of your completed work" />

      <Form.Dropdown id="period" title="Time Period" value={period} onChange={handlePeriodChange}>
        <Form.Dropdown.Item value="day" title="Today" />
        <Form.Dropdown.Item value="week" title="This Week" />
        <Form.Dropdown.Item value="month" title="This Month" />
      </Form.Dropdown>

      <Form.Dropdown id="format" title="Format" value={format} onChange={handleFormatChange}>
        <Form.Dropdown.Item value="standup" title="Standup (Yesterday/Today/Blockers)" />
        <Form.Dropdown.Item value="detailed" title="Detailed Report" />
        <Form.Dropdown.Item value="bullet" title="Bullet Points" />
      </Form.Dropdown>

      <Form.Description text="The AI will analyze your completed tasks and generate a professional summary." />
    </Form>
  );
}

function SummaryDisplay({ summary, options }: { summary: string; options: TaskSummaryOptions }) {
  async function handleCopy() {
    await Clipboard.copy(summary);
    await showToast({
      style: Toast.Style.Success,
      title: "✓ Summary copied to clipboard",
    });
  }

  const periodLabels = {
    day: "Today",
    week: "This Week",
    month: "This Month",
  };

  const formatLabels = {
    standup: "Standup Format",
    detailed: "Detailed Report",
    bullet: "Bullet Points",
  };

  const markdown = `# 📊 Task Summary\n\n**Period:** ${periodLabels[options.period]} | **Format:** ${formatLabels[options.format]}\n\n---\n\n${summary}`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Copy to Clipboard" icon={Icon.Clipboard} onAction={handleCopy} />
          <Action.CopyToClipboard title="Copy Text" content={summary} />
        </ActionPanel>
      }
    />
  );
}

export default function AITaskSummary() {
  const [summary, setSummary] = useState<string | null>(null);
  const [options, setOptions] = useState<TaskSummaryOptions | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleGenerate(opts: TaskSummaryOptions) {
    setIsLoading(true);
    setOptions(opts);

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "🤖 AI is generating your summary...",
    });

    try {
      // Fetch tasks based on period
      let tasks;
      if (opts.period === "day") {
        tasks = await getCompletedTodayTasks();
      } else {
        const allTasks = await getAllTasks();
        const cutoffDate = opts.period === "week" ? startOfWeek(new Date()) : startOfMonth(new Date());

        tasks = allTasks.filter((t) => {
          if (t.Status !== "Done" || !t.lastEditedTime) return false;
          const editedDate = new Date(t.lastEditedTime);
          return editedDate >= cutoffDate;
        });
      }

      if (tasks.length === 0) {
        toast.style = Toast.Style.Failure;
        toast.title = "No completed tasks found";
        toast.message = `No tasks were completed in the selected period`;
        setIsLoading(false);
        return;
      }

      const generatedSummary = await generateTaskSummary(tasks, opts);
      setSummary(generatedSummary);

      toast.style = Toast.Style.Success;
      toast.title = `✨ Summary generated from ${tasks.length} tasks`;
    } catch (error) {
      console.error("Error generating summary:", error);
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to generate summary";
      toast.message = error instanceof Error ? error.message : "Unknown error occurred";
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <Detail
        isLoading={true}
        markdown="# 🤖 AI is generating your summary...\n\nAnalyzing your completed tasks and crafting a professional summary."
      />
    );
  }

  if (summary && options) {
    return <SummaryDisplay summary={summary} options={options} />;
  }

  return <SummaryForm onGenerate={handleGenerate} />;
}
