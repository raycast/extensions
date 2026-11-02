import { Action, ActionPanel, Form, Icon, Toast, popToRoot, showToast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
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

export default function Command() {
  const { push } = useNavigation();
  const [workspaces, setWorkspaces] = useState<Workspace[]>();
  const [lastForm, setLastForm] = useState<LastForm>();
  const [emojiChoice, setEmojiChoice] = useState<string>();
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function reload() {
    const [loaded, last] = await Promise.all([loadWorkspaces(), loadLastForm()]);
    const known = new Set(loaded.map((workspace) => workspace.teamId));
    const selected = last?.teamIds.filter((teamId) => known.has(teamId)) ?? [];
    setWorkspaces(loaded);
    setLastForm(last);
    setTeamIds(selected.length > 0 ? selected : [...known]);
    const isCommon = COMMON_EMOJIS.some((item) => item.value === last?.emoji);
    setEmojiChoice(!last?.emoji ? COMMON_EMOJIS[0].value : isCommon ? last.emoji : CUSTOM_EMOJI);
  }

  useEffect(() => {
    reload();
  }, []);

  function selectedWorkspaces(ids: string[]) {
    return (workspaces ?? []).filter((workspace) => ids.includes(workspace.teamId));
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
    await saveLastForm({ teamIds: values.teamIds, emoji, text, duration: values.duration });
    const results = await setStatus(selectedWorkspaces(values.teamIds), {
      emoji,
      text,
      expiration: expirationFor(values.duration),
    });
    setIsSubmitting(false);
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

  const isLoading = workspaces === undefined || emojiChoice === undefined;
  if (isLoading) {
    return <Form isLoading />;
  }

  const manageAction = (
    <Action
      title="Manage Workspaces"
      icon={Icon.Gear}
      shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
      onAction={() => push(<ManageWorkspaces onChange={reload} />)}
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
          <Action
            title="Clear Status"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
            onAction={clear}
          />
          {manageAction}
        </ActionPanel>
      }
    >
      <Form.TagPicker id="teamIds" title="Workspaces" value={teamIds} onChange={setTeamIds}>
        {workspaces.map((workspace) => (
          <Form.TagPicker.Item key={workspace.teamId} value={workspace.teamId} title={workspace.name} />
        ))}
      </Form.TagPicker>
      <Form.Dropdown id="emojiChoice" title="Emoji" value={emojiChoice} onChange={setEmojiChoice}>
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
