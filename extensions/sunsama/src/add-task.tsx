import {
  Action,
  ActionPanel,
  Form,
  getPreferenceValues,
  Icon,
  PopToRootType,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";
import { useEffect, useState } from "react";
import {
  createTask,
  getDefaultChannel,
  getRecentChannel,
  rememberLastChannel,
} from "./lib/sunsama-client";
import { toDayString } from "./lib/date";
import { reportError } from "./lib/errors";
import { parseDuration, parseSubtasks } from "./lib/time";
import {
  ChannelDropdown,
  RefreshChannelsAction,
  useChannels,
} from "./components/channel-dropdown";

interface FormValues {
  task: string;
  notes: string;
  day: Date | null;
  channel: string;
  position: string;
  timeEstimate: string;
  subtasks: string;
}

const isUrl = (s: string) => /^https?:\/\/\S+$/i.test(s);

const TIME_HINT = "1h 30m · 90 · 1:15 · 45m";

export default function AddTask() {
  const [submitting, setSubmitting] = useState(false);
  const { defaultPosition, rememberChannelMinutes } =
    getPreferenceValues<Preferences.AddTask>();
  const rememberFor = Number(rememberChannelMinutes) || 0;
  const channels = useChannels();

  // The channel to start on: the one just used, while it's still recent, and
  // otherwise the saved default. Resolved together so the field is only set
  // once and doesn't visibly change under the cursor.
  const { data: startingChannel } = useCachedPromise(
    async (minutes: number) => {
      const recent = await getRecentChannel(minutes);
      if (recent) return recent;
      return (await getDefaultChannel())?.name ?? "";
    },
    [rememberFor],
  );

  // useForm keeps the fields controlled, which is what lets the saved default
  // channel be applied below once it resolves — `defaultValue` is only read
  // once per component lifecycle and would ignore it.
  const { handleSubmit, itemProps, setValue } = useForm<FormValues>({
    onSubmit: submit,
    initialValues: {
      task: "",
      notes: "",
      day: new Date(),
      channel: startingChannel ?? "",
      position: defaultPosition,
      timeEstimate: "",
      subtasks: "",
    },
    validation: {
      task: FormValidation.Required,
      // Optional, but must parse when filled in.
      timeEstimate: (value) =>
        value?.trim() && parseDuration(value) === null
          ? `Enter a time like ${TIME_HINT}`
          : undefined,
    },
  });

  // On the very first run (no cache yet), apply it once it resolves.
  useEffect(() => {
    if (startingChannel) setValue("channel", startingChannel);
  }, [startingChannel, setValue]);

  async function submit(values: FormValues) {
    const entry = values.task.trim();

    // The single field supports three shapes; the server handles the link
    // natively (Trello/GitHub/Todoist/ClickUp/… or a plain web page):
    //   "<link> <title>" → link it, and use the text after the space as the title
    //   "<link>"         → link it, title comes from the linked item
    //   "<text>"         → a plain task title
    let url: string | undefined;
    let title = entry;
    const leading = entry.match(/^(\S+)\s+(.+)$/);
    if (leading && isUrl(leading[1])) {
      url = leading[1];
      title = leading[2].trim();
    } else if (isUrl(entry)) {
      url = entry;
      title = "";
    }

    // Validation already rejected anything unparseable.
    const timeEstimate = values.timeEstimate.trim()
      ? (parseDuration(values.timeEstimate) as number)
      : undefined;

    setSubmitting(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating task…",
    });
    try {
      const createdTitle = await createTask({
        title,
        day: toDayString(values.day ?? new Date()),
        url,
        notes: values.notes.trim() || undefined,
        channel: values.channel || undefined,
        position: values.position === "bottom" ? "bottom" : "top",
        timeEstimate,
        subtasks: parseSubtasks(values.subtasks),
      });
      // Recorded after the task lands, so the next one can start here while
      // it's still recent.
      await rememberLastChannel(values.channel);
      await toast.hide();
      // Close and go back to root. Without an explicit type this follows the
      // user's "Pop to Root Search" preference, which can leave the filled-in
      // form on the stack for the next launch.
      await showHUD(`Added task: ${createdTitle}`, {
        popToRootType: PopToRootType.Immediate,
        clearRootSearch: true,
      });
    } catch (error) {
      toast.hide();
      await reportError(error, "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={submitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Task"
            icon={Icon.Plus}
            onSubmit={handleSubmit}
          />
          <RefreshChannelsAction channels={channels} />
        </ActionPanel>
      }
    >
      <Form.TextField
        {...itemProps.task}
        title="Task"
        placeholder="What needs doing — or paste a link"
        autoFocus
      />
      <Form.TextArea
        {...itemProps.notes}
        title="Notes"
        placeholder="Optional details (Markdown supported)"
        enableMarkdown
      />
      <Form.DatePicker
        {...itemProps.day}
        title="Day"
        type={Form.DatePicker.Type.Date}
      />
      <Form.Separator />
      <ChannelDropdown {...itemProps.channel} channels={channels} />
      <Form.Dropdown {...itemProps.position} title="Position">
        <Form.Dropdown.Item
          value="top"
          title="Top of day"
          icon={Icon.ArrowUp}
        />
        <Form.Dropdown.Item
          value="bottom"
          title="Bottom of day"
          icon={Icon.ArrowDown}
        />
      </Form.Dropdown>
      <Form.TextField
        {...itemProps.timeEstimate}
        title="Time Estimate"
        placeholder={TIME_HINT}
      />
      <Form.TextArea
        {...itemProps.subtasks}
        title="Subtasks"
        placeholder="One subtask per line"
      />
    </Form>
  );
}
