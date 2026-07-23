import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import {
  AuthorPlaybackMode,
  CommitSoundsConfig,
  installOrRepairHook,
  setAuthorPlaybackSettings,
} from "./lib/commit-sounds";

type FormValues = {
  playbackMode: AuthorPlaybackMode;
  selectedAuthorEmails: string;
  playbackCooldownSeconds: string;
};

type AuthorPlaybackSettingsProps = {
  config: CommitSoundsConfig;
  defaultEmail?: string;
  onSaved: () => Promise<void>;
};

function parseEmails(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((email) => email.trim())
    .filter(Boolean);
}

export function AuthorPlaybackSettings({
  config,
  defaultEmail,
  onSaved,
}: AuthorPlaybackSettingsProps) {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [playbackMode, setPlaybackMode] = useState<AuthorPlaybackMode>(
    config.authorPlaybackMode,
  );
  const defaultEmails =
    config.selectedAuthorEmails.length > 0
      ? config.selectedAuthorEmails.join("\n")
      : defaultEmail || "";

  async function submit(values: FormValues) {
    setIsSubmitting(true);
    try {
      await installOrRepairHook();
      await setAuthorPlaybackSettings(
        values.playbackMode,
        values.playbackMode === "selected"
          ? parseEmails(values.selectedAuthorEmails)
          : [],
        Number(values.playbackCooldownSeconds),
      );
      await onSaved();
      await showToast({
        style: Toast.Style.Success,
        title:
          values.playbackMode === "anyone"
            ? "Sounds will play for every local author"
            : "Author filter saved",
      });
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not save playback settings",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle="Who Triggers Sounds"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Playback Settings" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Git runs this hook only for commits made on this Mac. These controls decide which commit author emails can trigger a matching GitHub owner or organization rule." />
      <Form.Dropdown
        id="playbackMode"
        title="Play Sounds For"
        value={playbackMode}
        onChange={(value) => setPlaybackMode(value as AuthorPlaybackMode)}
      >
        <Form.Dropdown.Item
          value="anyone"
          title="Everyone who commits on this Mac"
        />
        <Form.Dropdown.Item
          value="selected"
          title="Only selected author emails"
        />
      </Form.Dropdown>
      <Form.Dropdown
        id="playbackCooldownSeconds"
        title="Minimum Time Between Sounds"
        defaultValue={String(config.playbackCooldownSeconds)}
        info="Rapid commits within this window are silent, preventing overlapping audio from agent workflows."
      >
        <Form.Dropdown.Item value="0" title="No cooldown" />
        <Form.Dropdown.Item value="1" title="1 second" />
        <Form.Dropdown.Item value="3" title="3 seconds" />
        <Form.Dropdown.Item value="5" title="5 seconds (recommended)" />
        <Form.Dropdown.Item value="10" title="10 seconds" />
        <Form.Dropdown.Item value="30" title="30 seconds" />
      </Form.Dropdown>
      {playbackMode === "selected" && (
        <Form.TextArea
          id="selectedAuthorEmails"
          title="Allowed Author Emails"
          placeholder="you@company.com\nother@company.com"
          defaultValue={defaultEmails}
          info="Add one email per line, or separate addresses with commas."
        />
      )}
    </Form>
  );
}
