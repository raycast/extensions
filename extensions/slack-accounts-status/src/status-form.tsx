import { Action, ActionPanel, Color, Detail, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useRef, useState } from "react";
import { randomUUID } from "node:crypto";
import { applyToAccounts } from "./accounts";
import { AccountResult } from "./apply";
import {
  Account,
  clearStatusPreset,
  createStatusRequest,
  customPreset,
  Duration,
  errorMessage,
  isDuration,
  Notifications,
  Presence,
  PresencePreset,
  Preset,
  StatusChange,
  statusEmojiIcon,
  statusEmojis,
} from "./domain";
import { savePreset } from "./state";

function Results({
  accounts,
  request,
  initialResults,
}: {
  accounts: Account[];
  request: StatusChange;
  initialResults: AccountResult[];
}) {
  const [results, setResults] = useState(initialResults);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const failed = results.filter((result) => result.changes.some((change) => !change.ok));
  const profile = request.profile;
  const status = profile
    ? [statusEmojiIcon(profile.status_emoji) ?? profile.status_emoji, profile.status_text].filter(Boolean).join(" ")
    : "";
  async function retry() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      const retried = await applyToAccounts(
        accounts.filter((account) => failed.some((result) => result.account.id === account.id)),
        request,
        results,
      );
      setResults((current) =>
        current.map((result) => retried.find((item) => item.account.id === result.account.id) ?? result),
      );
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Could Not Retry Changes", message: errorMessage(error) });
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  return (
    <List
      isLoading={busy}
      isShowingDetail
      navigationTitle="Slack Status Results"
      searchBarPlaceholder="Search workspace results…"
    >
      {results.map((result) => {
        const succeeded = result.changes.filter((change) => change.ok).length;
        const allApplied = succeeded === result.changes.length;
        const markdown = [
          `# ${result.account.teamName}`,
          `Account: ${result.account.userName}`,
          profile &&
            `**Requested status:** ${status.replace(/[\\`*_[\]<>]/g, "\\$&").replace(/\s+/g, " ") || "Clear status"}`,
          ...result.changes.map(
            (change) =>
              `${change.ok ? "✅" : "⚠️"} **${change.operation[0].toUpperCase()}${change.operation.slice(1)}:** ${change.ok ? "Applied" : change.error}`,
          ),
          profile &&
            `Requested status expiry: ${profile.status_expiration ? new Date(profile.status_expiration * 1000).toLocaleString() : "Never"}.`,
          request.presence === "away" && "Requested presence: Away (until changed).",
          request.presence === "auto" && "Requested presence: Automatic (Slack decides when you’re active).",
        ]
          .filter(Boolean)
          .join("\n\n");
        return (
          <List.Item
            key={result.account.id}
            title={result.account.teamName}
            subtitle={result.account.userName}
            icon={{
              source: allApplied ? Icon.CheckCircle : Icon.ExclamationMark,
              tintColor: allApplied ? Color.Green : Color.Orange,
            }}
            accessories={[{ text: `${succeeded}/${result.changes.length} applied` }]}
            detail={<List.Item.Detail markdown={markdown} />}
            actions={
              <ActionPanel>
                {failed.length > 0 && (
                  <Action title="Retry Failed Changes" icon={Icon.ArrowClockwise} onAction={retry} />
                )}
                <Action.Push title="View Full Result" icon={Icon.Document} target={<Detail markdown={markdown} />} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

export default function StatusForm({
  accounts,
  initial,
  onPresetSaved,
}: {
  accounts: Account[];
  initial: Preset | PresencePreset;
  onPresetSaved: () => Promise<void>;
}) {
  const { push } = useNavigation();
  const isClear = initial === clearStatusPreset;
  const editable = "text" in initial && !isClear;
  const preset = "text" in initial ? initial : customPreset;
  const [text, setText] = useState(preset.text);
  const [emojiChoice, setEmojiChoice] = useState(() =>
    preset.emoji && !statusEmojis.some((item) => item.shortcode === preset.emoji) ? "other" : preset.emoji,
  );
  const [shortcode, setShortcode] = useState(() => (emojiChoice === "other" ? preset.emoji : ""));
  const emoji = emojiChoice === "other" ? shortcode : emojiChoice;
  const preview = [statusEmojiIcon(emoji) ?? emoji.trim(), text].filter(Boolean).join(" ");
  const [duration, setDuration] = useState<Duration>(preset.duration);
  const [minutes, setMinutes] = useState(preset.customMinutes);
  const [until, setUntil] = useState<Date | null>(null);
  const [presence, setPresence] = useState<Presence>(initial.presence);
  const [notifications, setNotifications] = useState<Notifications>(preset.notifications);
  const [selected, setSelected] = useState(accounts.map((account) => account.id));
  const [presetName, setPresetName] = useState(initial.id.startsWith("saved-") ? initial.name : "");
  const [presetId] = useState(() => (initial.id.startsWith("saved-") ? initial.id : `saved-${randomUUID()}`));
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);

  async function submit(saveOnly: boolean) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      const preset: Preset = {
        id: presetId,
        name: presetName.trim(),
        text,
        emoji,
        duration,
        customMinutes: minutes,
        presence,
        notifications,
      };
      const request: StatusChange =
        "text" in initial
          ? createStatusRequest(isClear ? clearStatusPreset : preset, until)
          : { presence: initial.presence, notifications: "keep" };
      if (saveOnly) {
        if (!preset.name) throw new Error("Enter a preset name before saving.");
        if (duration === "until")
          throw new Error("Use a relative duration when saving a preset, such as 60 minutes or Today.");
        await savePreset(preset);
        await onPresetSaved();
        await showToast({ style: Toast.Style.Success, title: "Preset Saved", message: preset.name });
      } else {
        const targets = accounts.filter((account) => selected.includes(account.id));
        if (!targets.length) throw new Error("Select at least one workspace.");
        const results = await applyToAccounts(targets, request);
        const failedCount = results.filter((result) => result.changes.some((change) => !change.ok)).length;
        await showToast({
          style: failedCount ? Toast.Style.Failure : Toast.Style.Success,
          title: failedCount
            ? `Review Changes in ${failedCount} Workspace${failedCount === 1 ? "" : "s"}`
            : "Status Applied",
          message: `${targets.length} workspace${targets.length === 1 ? "" : "s"}`,
        });
        push(<Results accounts={targets} request={request} initialResults={results} />);
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: saveOnly ? "Could Not Save Preset" : "Could Not Apply Status",
        message: errorMessage(error),
      });
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <Form
      isLoading={busy}
      navigationTitle={initial.name}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isClear ? "Clear Status" : "Apply Status"}
            icon={isClear ? Icon.Eraser : Icon.CheckCircle}
            onSubmit={() => submit(false)}
          />
          {editable && <Action.SubmitForm title="Save Preset" icon={Icon.Plus} onSubmit={() => submit(true)} />}
        </ActionPanel>
      }
    >
      {editable ? (
        <>
          <Form.TextField
            id="text"
            title="Status"
            placeholder="What are you working on?"
            value={text}
            onChange={setText}
            error={[...text].length > 100 ? "Use up to 100 characters." : undefined}
            info="Leave status and emoji empty to clear your current status."
          />
          <Form.Dropdown id="emoji" title="Emoji" value={emojiChoice} onChange={setEmojiChoice}>
            <Form.Dropdown.Item value="" title="No Emoji" />
            {statusEmojis.map((item) => (
              <Form.Dropdown.Item key={item.shortcode} value={item.shortcode} title={item.name} icon={item.emoji} />
            ))}
            <Form.Dropdown.Item value="other" title="Other Slack Emoji…" />
          </Form.Dropdown>
          {emojiChoice === "other" && (
            <Form.TextField
              id="shortcode"
              title="Emoji Shortcode"
              placeholder=":custom_emoji:"
              value={shortcode}
              onChange={setShortcode}
              info="Use an emoji shortcode available in every selected workspace. Custom emoji appear here as shortcodes."
            />
          )}
          <Form.Description title="Preview" text={preview || "Clear status"} />
          <Form.Dropdown
            id="duration"
            title="Clear Status After"
            value={duration}
            onChange={(value) => {
              if (isDuration(value)) setDuration(value);
            }}
          >
            <Form.Dropdown.Item value="30" title="30 Minutes" />
            <Form.Dropdown.Item value="60" title="1 Hour" />
            <Form.Dropdown.Item value="120" title="2 Hours" />
            <Form.Dropdown.Item value="today" title="Today (Local Midnight)" />
            <Form.Dropdown.Item value="never" title="Never" />
            <Form.Dropdown.Item value="custom" title="Custom Minutes" />
            <Form.Dropdown.Item value="until" title="Specific Date and Time" />
          </Form.Dropdown>
          {duration === "custom" && (
            <Form.TextField id="minutes" title="Minutes" value={minutes} onChange={setMinutes} placeholder="90" />
          )}
          {duration === "until" && (
            <Form.DatePicker
              id="until"
              title="Clear At"
              value={until}
              onChange={setUntil}
              type={Form.DatePicker.Type.DateTime}
            />
          )}
        </>
      ) : "description" in initial ? (
        <Form.Description title="Presence" text={initial.description} />
      ) : (
        <Form.Description
          title="Status"
          text="Remove your status text and emoji. Leave presence and notifications unchanged."
        />
      )}
      <Form.TagPicker id="workspaces" title="Workspaces" value={selected} onChange={setSelected}>
        {accounts.map((account) => (
          <Form.TagPicker.Item
            key={account.id}
            value={account.id}
            title={`${account.teamName} (${account.userName})`}
            icon="slack-accounts-status.png"
          />
        ))}
      </Form.TagPicker>
      {editable && (
        <>
          <Form.Separator />
          <Form.Dropdown
            id="presence"
            title="Presence (Not Timed)"
            value={presence}
            onChange={(value) => {
              if (value === "keep" || value === "auto" || value === "away") setPresence(value);
            }}
          >
            <Form.Dropdown.Item value="keep" title="Leave Unchanged" />
            <Form.Dropdown.Item value="auto" title="Automatic (Slack Decides Active or Away)" />
            <Form.Dropdown.Item value="away" title="Away (Until Changed)" />
          </Form.Dropdown>
          <Form.Dropdown
            id="notifications"
            title="Notifications"
            info="Slack ends notification pauses automatically. Pauses use whole minutes and can end up to one minute after status expiry."
            value={notifications}
            onChange={(value) => {
              if (value === "keep" || value === "pause" || value === "resume") setNotifications(value);
            }}
          >
            <Form.Dropdown.Item value="keep" title="Leave Unchanged" />
            <Form.Dropdown.Item value="pause" title="Pause Until Status Expires" />
            <Form.Dropdown.Item value="resume" title="End Current Pause (Keep Slack Schedule)" />
          </Form.Dropdown>
          <Form.Separator />
          <Form.TextField
            id="presetName"
            title="Preset Name"
            placeholder="Optional (use Save Preset)"
            value={presetName}
            onChange={setPresetName}
            info="Presets save status settings, not selected workspaces. Applying a preset opens this form so you can review its targets."
          />
        </>
      )}
    </Form>
  );
}
