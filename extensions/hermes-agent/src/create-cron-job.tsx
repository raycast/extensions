import {
  Action,
  ActionPanel,
  Detail,
  Form,
  LaunchProps,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useMemo, useState } from "react";
import { getConfig } from "./api";
import {
  createCronJob,
  CronJob,
  listSkills,
  SkillSummary,
} from "./hermes-client";

const SCHEDULE_PRESETS: {
  title: string;
  value: string;
  description: string;
}[] = [
  {
    title: "Every 30 minutes",
    value: "30m",
    description: "Recurring every 30m",
  },
  { title: "Every 2 hours", value: "2h", description: "Recurring every 2h" },
  { title: "Daily at 9am", value: "0 9 * * *", description: "Cron: 0 9 * * *" },
  {
    title: "Daily at 5pm",
    value: "0 17 * * *",
    description: "Cron: 0 17 * * *",
  },
  {
    title: "Weekly Monday 9am",
    value: "0 9 * * 1",
    description: "Cron: 0 9 * * 1",
  },
  {
    title: "Monthly 1st at 9am",
    value: "0 9 1 * *",
    description: "Cron: 0 9 1 * *",
  },
];

const DELIVER_OPTIONS = [
  { title: "Local (no delivery)", value: "local" },
  { title: "Origin chat", value: "origin" },
  { title: "All connected channels", value: "all" },
];

function CreatedView({ job }: { job: CronJob }) {
  const markdown = `## Cron Job Created

**${job.name}**

| Property | Value |
|----------|-------|
| ID | \`${job.id}\` |
| Schedule | ${job.schedule.display} |
| Next run | ${job.next_run_at ? new Date(job.next_run_at).toLocaleString() : "pending"} |
| Deliver | ${job.deliver} |
${job.skills.length > 0 ? `| Skills | ${job.skills.join(", ")} |` : ""}

**Prompt:**
${job.prompt}`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Job ID" content={job.id} />
          <Action.CopyToClipboard
            title="Copy Prompt"
            content={job.prompt}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

export default function Command(
  props: LaunchProps<{ arguments: { schedule?: string } }>,
) {
  const config = useMemo(() => getConfig(), []);
  const { push } = useNavigation();
  const [name, setName] = useState("");
  const [schedule, setSchedule] = useState(props.arguments?.schedule || "30m");
  const [prompt, setPrompt] = useState("");
  const [deliver, setDeliver] = useState("local");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [availableSkills, setAvailableSkills] = useState<SkillSummary[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load skills for the multi-select
  useMemo(() => {
    listSkills(config)
      .then(setAvailableSkills)
      .catch(() => undefined);
  }, [config]);

  async function handleSubmit() {
    if (!name.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Name is required" });
      return;
    }
    if (!schedule.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Schedule is required" });
      return;
    }
    if (!prompt.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Prompt is required" });
      return;
    }

    setIsSubmitting(true);
    try {
      const job = await createCronJob(config, {
        name: name.trim(),
        schedule: schedule.trim(),
        prompt: prompt.trim(),
        deliver,
        skills: selectedSkills.length > 0 ? selectedSkills : undefined,
      });
      showToast({ style: Toast.Style.Success, title: "Cron job created" });
      push(<CreatedView job={job} />);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to create job",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Cron Job" onSubmit={handleSubmit} />
        </ActionPanel>
      }
      navigationTitle="Create Cron Job"
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="Daily briefing"
        value={name}
        onChange={setName}
        autoFocus
      />
      <Form.TextField
        id="schedule"
        title="Schedule"
        placeholder="30m, 2h, 0 9 * * *, 2026-08-01T09:00:00"
        value={schedule}
        onChange={setSchedule}
        info="Duration (30m, 2h), cron expression (0 9 * * *), or ISO timestamp"
      />
      <Form.TextArea
        id="prompt"
        title="Prompt"
        placeholder="What should Hermes do when this job fires?"
        value={prompt}
        onChange={setPrompt}
      />
      <Form.Separator />
      <Form.Dropdown
        id="deliver"
        title="Deliver To"
        value={deliver}
        onChange={setDeliver}
      >
        {DELIVER_OPTIONS.map((opt) => (
          <Form.Dropdown.Item
            key={opt.value}
            value={opt.value}
            title={opt.title}
          />
        ))}
      </Form.Dropdown>
      {availableSkills.length > 0 && (
        <Form.TagPicker
          id="skills"
          title="Skills"
          value={selectedSkills}
          onChange={setSelectedSkills}
        >
          {availableSkills.slice(0, 50).map((skill) => (
            <Form.TagPicker.Item
              key={skill.name}
              value={skill.name}
              title={skill.name}
            />
          ))}
        </Form.TagPicker>
      )}
      <Form.Separator />
      <Form.Description
        title="Schedule Presets"
        text={SCHEDULE_PRESETS.map((p) => `${p.title}: ${p.value}`).join("\n")}
      />
    </Form>
  );
}
