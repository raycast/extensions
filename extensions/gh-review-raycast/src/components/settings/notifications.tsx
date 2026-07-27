import { Action, ActionPanel, Color, Form, Icon, List, Toast, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";

import { useConfig } from "../../hooks";
import { inQuietHours, quietHoursLabel, resetTracker } from "../../lib/activity";
import { ACTIVITY_KINDS, type NotificationSettings } from "../../lib/config";
import { hasTerminalNotifier, notificationsAvailable, send } from "../../lib/notify";

/** Validates an "HH:MM" string; empty is allowed and means "no window". */
function clockError(value: string): string | undefined {
  if (!value.trim()) return undefined;
  return /^([01]?\d|2[0-3]):[0-5]\d$/.test(value.trim()) ? undefined : "Use 24-hour HH:MM, e.g. 18:30";
}

/** Edits the do-not-disturb window and the per-check banner cap. */
function QuietHoursForm({
  settings,
  onSave,
}: {
  settings: NotificationSettings;
  onSave: (next: NotificationSettings) => Promise<void>;
}) {
  const { pop } = useNavigation();
  const [from, setFrom] = useState(settings.quietFrom);
  const [to, setTo] = useState(settings.quietTo);
  const [cap, setCap] = useState(String(settings.maxBanners));
  const [errors, setErrors] = useState<{ from?: string; to?: string; cap?: string }>({});

  return (
    <Form
      navigationTitle="Quiet Hours & Limits"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            onSubmit={async () => {
              const next = {
                from: clockError(from),
                to: clockError(to),
                cap: Number.parseInt(cap, 10) > 0 ? undefined : "Enter a number of 1 or more",
              };
              setErrors(next);
              if (next.from || next.to || next.cap) return;

              await onSave({
                ...settings,
                quietFrom: from.trim(),
                quietTo: to.trim(),
                maxBanners: Number.parseInt(cap, 10),
              });
              pop();
            }}
          />
          <Action
            icon={Icon.XMarkCircle}
            title="Turn Quiet Hours off"
            onAction={async () => {
              await onSave({ ...settings, quietFrom: "", quietTo: "" });
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="During quiet hours nothing buzzes — activity is still recorded in the Activity Inbox, so you can catch up whenever you want. Leave both fields empty to disable the window." />
      <Form.TextField
        id="from"
        title="Quiet From"
        placeholder="18:00"
        value={from}
        error={errors.from}
        onChange={(v) => {
          setFrom(v);
          if (errors.from) setErrors({ ...errors, from: undefined });
        }}
      />
      <Form.TextField
        id="to"
        title="Quiet Until"
        placeholder="09:00"
        info="The window may wrap past midnight — 18:00 to 09:00 silences evenings and nights."
        value={to}
        error={errors.to}
        onChange={(v) => {
          setTo(v);
          if (errors.to) setErrors({ ...errors, to: undefined });
        }}
      />
      <Form.Separator />
      <Form.TextField
        id="cap"
        title="Max Banners per Check"
        placeholder="5"
        info="Anything beyond this is folded into a single summary banner, so a busy morning can't storm Notification Center."
        value={cap}
        error={errors.cap}
        onChange={(v) => {
          setCap(v);
          if (errors.cap) setErrors({ ...errors, cap: undefined });
        }}
      />
    </Form>
  );
}

/**
 * Every control over how intrusive the extension is allowed to be. Banners are
 * off until explicitly turned on; the Activity Inbox records regardless, so
 * turning them off never means missing something.
 */
export function NotificationSettingsView() {
  const { config, update } = useConfig();
  const settings = config.notifications;

  const supported = notificationsAvailable();
  const clickable = hasTerminalNotifier();
  const muted = inQuietHours(settings);

  async function save(next: NotificationSettings) {
    await update({ ...config, notifications: next });
  }

  async function test() {
    const ok = await send({
      title: "GH Review",
      subtitle: "Test notification",
      body: "This is what a banner looks like.",
      group: "gh-review-test",
      sound: settings.sound ? "Ping" : undefined,
    });
    await showToast({
      style: ok ? Toast.Style.Success : Toast.Style.Failure,
      title: ok ? "Banner sent" : "Couldn't send a banner",
      message: ok
        ? "If nothing appeared, check System Settings › Notifications."
        : "Desktop notifications aren't available on this system.",
    });
  }

  const masterAccessory = !supported
    ? { tag: { value: "Unsupported", color: Color.SecondaryText } }
    : settings.enabled
      ? muted
        ? { tag: { value: "On · quiet hours", color: Color.Yellow } }
        : { tag: { value: "On", color: Color.Green } }
      : { tag: { value: "Off", color: Color.SecondaryText } };

  return (
    <List navigationTitle="Notifications" searchBarPlaceholder="Search notification settings…">
      <List.Section title="Banners">
        <List.Item
          icon={{ source: settings.enabled ? Icon.Bell : Icon.BellDisabled, tintColor: Color.Orange }}
          title="Desktop Notifications"
          subtitle={
            supported ? "Off by default — the Activity Inbox still records everything" : "Only available on macOS"
          }
          accessories={[masterAccessory]}
          actions={
            <ActionPanel>
              <Action
                icon={Icon.Switch}
                title={settings.enabled ? "Turn Notifications off" : "Turn Notifications on"}
                onAction={() => save({ ...settings, enabled: !settings.enabled })}
              />
              <Action icon={Icon.Bell} title="Send a Test Banner" onAction={test} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={{ source: Icon.Moon, tintColor: muted ? Color.Yellow : Color.SecondaryText }}
          title="Quiet Hours"
          subtitle={muted ? "Currently inside the quiet window" : "Silence banners during a daily window"}
          accessories={[{ text: quietHoursLabel(settings) }]}
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Moon}
                title="Edit Quiet Hours"
                target={<QuietHoursForm settings={settings} onSave={save} />}
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={{ source: Icon.Hashtag, tintColor: Color.SecondaryText }}
          title="Max Banners per Check"
          subtitle="Extras fold into one summary banner"
          accessories={[{ text: String(settings.maxBanners) }]}
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Pencil}
                title="Edit Limit"
                target={<QuietHoursForm settings={settings} onSave={save} />}
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={{ source: settings.sound ? Icon.SpeakerHigh : Icon.SpeakerOff, tintColor: Color.SecondaryText }}
          title="Sound"
          subtitle="Play a sound with each banner"
          accessories={[
            {
              tag: {
                value: settings.sound ? "On" : "Silent",
                color: settings.sound ? Color.Green : Color.SecondaryText,
              },
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                icon={Icon.Switch}
                title={settings.sound ? "Mute Banner Sound" : "Play a Sound"}
                onAction={() => save({ ...settings, sound: !settings.sound })}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Notify Me About" subtitle={settings.enabled ? undefined : "Banners are off"}>
        {ACTIVITY_KINDS.map(({ kind, title, description }) => {
          const on = settings.kinds[kind];
          return (
            <List.Item
              key={kind}
              icon={
                on
                  ? { source: Icon.CheckCircle, tintColor: settings.enabled ? Color.Green : Color.SecondaryText }
                  : { source: Icon.Circle, tintColor: Color.SecondaryText }
              }
              title={title}
              subtitle={description}
              actions={
                <ActionPanel>
                  <Action
                    icon={Icon.Switch}
                    title={on ? "Don't Notify About This" : "Notify About This"}
                    onAction={() => save({ ...settings, kinds: { ...settings.kinds, [kind]: !on } })}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      <List.Section title="Delivery">
        <List.Item
          icon={{
            source: clickable ? Icon.CheckCircle : Icon.Info,
            tintColor: clickable ? Color.Green : Color.Yellow,
          }}
          title="Clickable Banners"
          subtitle={
            clickable
              ? "terminal-notifier is installed — banners open the pull request when clicked"
              : "Install terminal-notifier for banners that open the PR on click"
          }
          accessories={[{ tag: clickable ? "terminal-notifier" : "osascript fallback" }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Install Command" content="brew install terminal-notifier" />
              <Action icon={Icon.Bell} title="Send a Test Banner" onAction={test} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={{ source: Icon.ArrowCounterClockwise, tintColor: Color.SecondaryText }}
          title="Reset the Baseline"
          subtitle="Forget what the watcher has seen; the next check records a fresh baseline without notifying"
          actions={
            <ActionPanel>
              <Action
                icon={Icon.ArrowCounterClockwise}
                title="Reset Baseline"
                onAction={async () => {
                  await resetTracker();
                  await showToast({ style: Toast.Style.Success, title: "Baseline reset" });
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
