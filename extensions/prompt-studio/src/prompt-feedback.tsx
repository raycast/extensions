import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  getPreferenceValues,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { dirname } from "node:path";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  deletePromptUseFeedback,
  exportPromptUseFeedback,
  listPromptUseFeedback,
  updatePromptUseFeedback,
  type InvalidFeedbackRecord,
  type PromptUseFeedbackRecord,
} from "./core/feedback-store";
import { getFeatureStatus, loadFeatureStatuses } from "./core/features";
import { resolvePromptDirectory } from "./core/prompt-store";
import { FeedbackForm, feedbackPatchFromForm } from "./feedback-form";

interface Preferences {
  libraryDirectory?: string;
}

type FeedbackFilter =
  | "all"
  | "useful"
  | "not-useful"
  | "not-rated"
  | "with-outcome";

export default function PromptFeedback() {
  const preferences = getPreferenceValues<Preferences>();
  const directory = useMemo(
    () => resolvePromptDirectory(preferences.libraryDirectory),
    [preferences.libraryDirectory],
  );
  const [records, setRecords] = useState<PromptUseFeedbackRecord[]>([]);
  const [invalid, setInvalid] = useState<InvalidFeedbackRecord[]>([]);
  const [featureDisabledReason, setFeatureDisabledReason] = useState<string>();
  const [filter, setFilter] = useState<FeedbackFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const statuses = await loadFeatureStatuses();
      const feature = getFeatureStatus(statuses, "feedback");
      if (feature.effectiveState === "disabled") {
        setFeatureDisabledReason(
          feature.reason ??
            "Outcome Feedback is Disabled until Activation 14 reaches Preview.",
        );
        setRecords([]);
        setInvalid([]);
        return;
      }
      setFeatureDisabledReason(undefined);
      const library = await listPromptUseFeedback(directory);
      setRecords(library.records);
      setInvalid(library.invalid);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : String(loadError),
      );
    } finally {
      setLoading(false);
    }
  }, [directory]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = records.filter((record) => {
    if (filter === "all") return true;
    if (filter === "with-outcome") return Boolean(record.outcome);
    return record.verdict === filter;
  });

  return (
    <List
      isLoading={loading}
      isShowingDetail={visible.length + invalid.length > 0}
      searchBarPlaceholder="Search feedback, prompts, agents, outcomes…"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter Feedback"
          value={filter}
          onChange={(value) => setFilter(value as FeedbackFilter)}
        >
          <List.Dropdown.Item title="All Feedback" value="all" />
          <List.Dropdown.Item title="Useful" value="useful" />
          <List.Dropdown.Item title="Not Useful" value="not-useful" />
          <List.Dropdown.Item title="Not Rated" value="not-rated" />
          <List.Dropdown.Item title="With Outcome" value="with-outcome" />
        </List.Dropdown>
      }
    >
      {!loading && featureDisabledReason ? (
        <List.EmptyView
          icon={Icon.CircleDisabled}
          title="Outcome Feedback Is Disabled"
          description={`${featureDisabledReason} No feedback files were read.`}
        />
      ) : null}
      {!loading && !featureDisabledReason && visible.length === 0 ? (
        <List.EmptyView
          icon={error ? Icon.ExclamationMark : Icon.TextDocument}
          title={error ? "Feedback Unavailable" : "No Feedback Found"}
          description={
            error ??
            "Open a prompt in Browse Prompts and choose Record Prompt Feedback."
          }
          actions={
            <ActionPanel>
              <Action
                title="Reload Feedback"
                icon={Icon.ArrowClockwise}
                onAction={load}
              />
            </ActionPanel>
          }
        />
      ) : null}
      <List.Section title="Prompt-use Feedback" subtitle={`${visible.length}`}>
        {visible.map((record) => (
          <FeedbackItem key={record.id} record={record} onReload={load} />
        ))}
      </List.Section>
      {invalid.length > 0 ? (
        <List.Section title="Needs Repair" subtitle={`${invalid.length}`}>
          {invalid.map((item) => (
            <List.Item
              key={item.filePath}
              icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
              title={item.filePath.split("/").at(-1) ?? item.filePath}
              subtitle={item.error}
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}

function FeedbackItem({
  record,
  onReload,
}: {
  record: PromptUseFeedbackRecord;
  onReload: () => Promise<void>;
}) {
  async function remove() {
    const confirmed = await confirmAlert({
      title: `Delete feedback for “${record.prompt.title}”?`,
      message:
        "This deletes only the feedback record. The prompt and its versions remain unchanged.",
      primaryAction: {
        title: "Delete Feedback",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;
    await deletePromptUseFeedback(
      promptDirectoryFromFeedback(record),
      record.id,
    );
    await showToast(Toast.Style.Success, "Feedback Deleted");
    await onReload();
  }

  return (
    <List.Item
      icon={feedbackIcon(record)}
      title={record.prompt.title}
      subtitle={feedbackSubtitle(record)}
      keywords={[
        record.id,
        record.prompt.promptId,
        record.prompt.title,
        record.prompt.summary,
        record.prompt.body,
        record.verdict,
        record.use.targetAgent,
        record.use.targetApplication ?? "",
        record.critique ?? "",
        record.correction ?? "",
        record.outcome?.status ?? "",
        record.outcome?.summary ?? "",
        record.notes ?? "",
      ]}
      accessories={[
        ...(record.rating ? [{ text: `${record.rating}/5` }] : []),
        { tag: record.use.targetAgent },
        { text: new Date(record.use.usedAt).toLocaleDateString() },
      ]}
      detail={<List.Item.Detail markdown={feedbackMarkdown(record)} />}
      actions={
        <ActionPanel>
          <Action.Push
            title="Edit Feedback"
            icon={Icon.Pencil}
            target={<EditFeedback record={record} onReload={onReload} />}
          />
          <Action.CopyToClipboard
            title="Copy Feedback as Markdown"
            content={exportPromptUseFeedback([record], "markdown")}
          />
          <Action.CopyToClipboard
            title="Copy Feedback as JSON"
            content={exportPromptUseFeedback([record], "json")}
          />
          <Action
            title="Reload Feedback"
            icon={Icon.ArrowClockwise}
            onAction={onReload}
          />
          <Action
            title="Delete Feedback"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={remove}
          />
        </ActionPanel>
      }
    />
  );
}

function EditFeedback({
  record,
  onReload,
}: {
  record: PromptUseFeedbackRecord;
  onReload: () => Promise<void>;
}) {
  const { pop } = useNavigation();
  return (
    <FeedbackForm
      prompt={record.prompt}
      initial={record}
      submitTitle="Save Feedback Changes"
      onSubmit={async (values) => {
        await updatePromptUseFeedback(
          promptDirectoryFromFeedback(record),
          record.id,
          feedbackPatchFromForm(values),
        );
        await onReload();
        await showToast(Toast.Style.Success, "Feedback Updated");
        pop();
      }}
    />
  );
}

function promptDirectoryFromFeedback(record: PromptUseFeedbackRecord): string {
  const feedbackRoot = dirname(record.filePath);
  if (feedbackRoot.split("/").at(-1) !== ".feedback") {
    throw new Error("Feedback record is outside the prompt library.");
  }
  return dirname(feedbackRoot);
}

function feedbackIcon(record: PromptUseFeedbackRecord) {
  if (record.verdict === "useful") {
    return { source: Icon.CheckCircle, tintColor: Color.Green };
  }
  if (record.verdict === "not-useful") {
    return { source: Icon.XMarkCircle, tintColor: Color.Red };
  }
  return { source: Icon.CircleDisabled, tintColor: Color.SecondaryText };
}

function feedbackSubtitle(record: PromptUseFeedbackRecord): string {
  if (record.outcome?.summary) return record.outcome.summary;
  if (record.critique) return record.critique;
  return record.prompt.summary;
}

function feedbackMarkdown(record: PromptUseFeedbackRecord): string {
  const sections = [
    `# ${record.prompt.title}`,
    [
      `**Verdict:** ${record.verdict}`,
      `**Rating:** ${record.rating ? `${record.rating}/5` : "not provided"}`,
      `**Used:** ${new Date(record.use.usedAt).toLocaleString()}`,
      `**Target:** ${record.use.targetAgent}`,
      `**Prompt version:** ${record.prompt.promptUpdatedAt}`,
      `**Prompt digest:** \`${record.prompt.sourceDigest}\``,
    ].join("  \n"),
    `## Prompt Snapshot\n\n${record.prompt.body}`,
  ];
  if (record.critique) sections.push(`## Critique\n\n${record.critique}`);
  if (record.correction) {
    sections.push(`## Correction\n\n${record.correction}`);
  }
  if (record.finalPrompt) {
    sections.push(`## Final Edited Prompt\n\n${record.finalPrompt}`);
  }
  if (record.outcome) {
    sections.push(
      `## Outcome\n\n**${record.outcome.status}**${record.outcome.summary ? `\n\n${record.outcome.summary}` : ""}`,
    );
  }
  if (record.notes) sections.push(`## Private Notes\n\n${record.notes}`);
  return sections.join("\n\n");
}
