import { Action, ActionPanel, Form, Icon, Toast, popToRoot, showToast, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import ManageWorkspaces from "./components/manage-workspaces";
import { DURATIONS, expirationFor } from "./lib/expiration";
import { Workspace, clearStatus, normalizeEmoji, setStatus, StatusResult, summarize } from "./lib/slack";
import { LastForm, loadLastForm, loadWorkspaces, saveLastForm } from "./lib/storage";

const CUSTOM_EMOJI = "custom";
const COMMON_EMOJIS = [
  { value: ":speech_balloon:", title: "💬 Status" },
  { value: ":spiral_calendar_pad:", title: "🗓️ In a Meeting" },
  { value: ":headphones:", title: "🎧 Focusing" },
  { value: ":house_with_garden:", title: "🏡 Working from Home" },
  { value: ":office:", title: "🏢 In the Office" },
  { value: ":knife_fork_plate:", title: "🍽️ Out for Lunch" },
  { value: ":coffee:", title: "☕ On a Break" },
  { value: ":train2:", title: "🚆 Commuting" },
  { value: ":palm_tree:", title: "🌴 On Vacation" },
  { value: ":face_with_thermometer:", title: "🤒 Out Sick" },
];

type FormValues = {
  emojiChoice: string;
  customEmoji?: string;
  text: string;
  duration: string;
  teamIds: string[];
};

async function report(results: StatusResult[], toast: Toast, successTitle: string): Promise<void> {
  const failed = results.filter((result) => result.error);
  if (failed.length === 0) {
    toast.style = Toast.Style.Success;
    toast.title = successTitle;
    toast.message = results.map((result) => result.workspace.name).join(", ");
    await popToRoot({ clearSearchBar: true });
    return;
  }
  toast.style = Toast.Style.Failure;
  toast.title = `${failed.length} of ${results.length} workspaces failed`;
  toast.message = summarize(results);
}

async function loadFormData() {
  const [workspaces, lastForm] = await Promise.all([loadWorkspaces(), loadLastForm()]);
  return { workspaces, lastForm };
}

function defaultTeamIds(workspaces: Workspace[], lastForm?: LastForm): string[] {
  const known = workspaces.map((workspace) => workspace.teamId);
  const selected = known.filter((teamId) => lastForm?.teamIds.includes(teamId));
  return selected.length > 0 ? selected : known;
}

function defaultEmojiChoice(lastForm?: LastForm): string {
  if (!lastForm?.emoji) {
    return COMMON_EMOJIS[0].value;
  }
  return COMMON_EMOJIS.some((item) => item.value === lastForm.emoji) ? lastForm.emoji : CUSTOM_EMOJI;
}

export default function Command() {
  const { push } = useNavigation();
  const { data, isLoading, error, revalidate } = usePromise(loadFormData, [], {
    failureToastOptions: { title: "Could not load workspaces" },
  });
  const [chosenEmoji, setChosenEmoji] = useState<string>();
  const [chosenTeamIds, setChosenTeamIds] = useState<string[]>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const workspaces = data?.workspaces ?? [];
  const lastForm = data?.lastForm;
  const emojiChoice = chosenEmoji ?? defaultEmojiChoice(lastForm);
  const teamIds = chosenTeamIds
    ? chosenTeamIds.filter((teamId) => workspaces.some((workspace) => workspace.teamId === teamId))
    : defaultTeamIds(workspaces, lastForm);

  function selectedWorkspaces(ids: string[]) {
    return workspaces.filter((workspace) => ids.includes(workspace.teamId));
  }

  async function submit(values: FormValues) {
    const emoji = normalizeEmoji(values.emojiChoice === CUSTOM_EMOJI ? (values.customEmoji ?? "") : values.emojiChoice);
    const text = values.text.trim();
    if (values.teamIds.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "Select at least one workspace" });
      return;
    }
    if (!emoji && !text) {
      await showToast({ style: Toast.Style.Failure, title: "Enter an emoji or status text" });
      return;
    }
    if (text.length > 100) {
      await showToast({ style: Toast.Style.Failure, title: "Status text can be at most 100 characters" });
      return;
    }
    setIsSubmitting(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Setting status…" });
    const results = await setStatus(selectedWorkspaces(values.teamIds), {
      emoji,
      text,
      expiration: expirationFor(values.duration),
    });
    setIsSubmitting(false);
    try {
      if (results.some((result) => !result.error)) {
        await saveLastForm({ teamIds: values.teamIds, emoji, text, duration: values.duration });
      }
    } catch (error) {
      const succeeded = results.filter((result) => !result.error).length;
      toast.style = Toast.Style.Failure;
      toast.title = `Status set in ${succeeded} of ${results.length} workspaces, but your selection could not be saved`;
      toast.message = [summarize(results), error instanceof Error ? error.message : String(error)]
        .filter(Boolean)
        .join("\n");
      return;
    }
    await report(results, toast, "Status set");
  }

  async function clear() {
    if (teamIds.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "Select at least one workspace" });
      return;
    }
    setIsSubmitting(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Clearing status…" });
    const results = await clearStatus(selectedWorkspaces(teamIds));
    setIsSubmitting(false);
    await report(results, toast, "Status cleared");
  }

  if (!data) {
    return (
      <Form
        isLoading={isLoading}
        actions={
          error && (
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          )
        }
      >
        {error && <Form.Description title="Could Not Load Workspaces" text={error.message} />}
      </Form>
    );
  }

  const manageAction = (
    <Action
      title="Manage Workspaces"
      icon={Icon.Gear}
      onAction={() => push(<ManageWorkspaces onChange={revalidate} />)}
    />
  );

  if (workspaces.length === 0) {
    return (
      <Form actions={<ActionPanel>{manageAction}</ActionPanel>}>
        <Form.Description title="No Workspaces Yet" text="Connect your Slack workspaces first. Press ⌘↩ to continue." />
      </Form>
    );
  }

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Set Status" icon={Icon.Check} onSubmit={submit} />
          {manageAction}
          <Action
            title="Clear Status"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
            onAction={clear}
          />
        </ActionPanel>
      }
    >
      <Form.TagPicker id="teamIds" title="Workspaces" value={teamIds} onChange={setChosenTeamIds}>
        {workspaces.map((workspace) => (
          <Form.TagPicker.Item key={workspace.teamId} value={workspace.teamId} title={workspace.name} />
        ))}
      </Form.TagPicker>
      <Form.Dropdown id="emojiChoice" title="Emoji" value={emojiChoice} onChange={setChosenEmoji}>
        {COMMON_EMOJIS.map((item) => (
          <Form.Dropdown.Item key={item.value} value={item.value} title={item.title} />
        ))}
        <Form.Dropdown.Item value={CUSTOM_EMOJI} title="Custom Emoji…" />
      </Form.Dropdown>
      {emojiChoice === CUSTOM_EMOJI && (
        <Form.TextField
          id="customEmoji"
          title="Custom Emoji"
          placeholder=":party_parrot:"
          defaultValue={lastForm?.emoji}
          info="Slack emoji name. Custom emoji must exist in every selected workspace."
        />
      )}
      <Form.TextField id="text" title="Status Text" placeholder="In a meeting" defaultValue={lastForm?.text} />
      <Form.Dropdown id="duration" title="Clear After" defaultValue={lastForm?.duration ?? "none"}>
        {DURATIONS.map((item) => (
          <Form.Dropdown.Item key={item.value} value={item.value} title={item.title} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
