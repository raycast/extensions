import {
  Action,
  ActionPanel,
  Form,
  Toast,
  getPreferenceValues,
  popToRoot,
  showToast,
  updateCommandMetadata,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  AwakeMode,
  TOAST_TITLE,
  ensureAwakeAvailable,
  minutesFromNowToAwakeTimestamp,
  nudgeStatus,
  readAwakeSettings,
  statusLabel,
  writeAwakeSettings,
} from "./lib/awake";

const DURATION_OPTIONS = [
  { title: "15 minutes", value: "15" },
  { title: "30 minutes", value: "30" },
  { title: "1 hour", value: "60" },
  { title: "2 hours", value: "120" },
  { title: "4 hours", value: "240" },
  { title: "8 hours", value: "480" },
];

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [duration, setDuration] = useState<string>(preferences.defaultDuration);

  // Earlier versions set this command's subtitle to live state; Raycast
  // persists that metadata until something overwrites it, and null clears
  // rather than reverting to the manifest value. Write the literal static
  // subtitle instead. See toggle-awake.ts.
  useEffect(() => {
    updateCommandMetadata({ subtitle: "Cortado" }).catch(() => {});
  }, []);

  async function handleSubmit() {
    try {
      ensureAwakeAvailable();
      const current = readAwakeSettings();
      // Mode 3 (Expirable), not mode 2 — see the comment on the equivalent
      // write in toggle-awake.ts for why. intervalHours/intervalMinutes are
      // zeroed deliberately rather than left holding a prior session's
      // values, since they're meaningless once mode is 3.
      const patch = {
        mode: AwakeMode.Expirable,
        keepDisplayOn: preferences.keepDisplayOn,
        intervalHours: 0,
        intervalMinutes: 0,
        expirationDateTime: minutesFromNowToAwakeTimestamp(Number(duration)),
      };

      await writeAwakeSettings(current, patch);

      await showToast({ style: Toast.Style.Success, title: statusLabel({ ...current.properties, ...patch }) });
      await nudgeStatus();
      await popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: TOAST_TITLE,
        message: (error as Error).message,
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Keep Awake" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="duration" title="Duration" value={duration} onChange={setDuration}>
        {DURATION_OPTIONS.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
