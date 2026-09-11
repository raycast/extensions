import {
  Action,
  ActionPanel,
  Alert,
  Form,
  Icon,
  Keyboard,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { Fragment, useState } from "react";
import { deleteBatteryAlerts, setBatteryAlert } from "./airbuddy";
import { showFailure } from "./feedback";
import type { BatteryAlert, Device } from "./types";

const POSITION_LABELS: Record<string, string> = {
  main: "Battery",
  "combined buds": "Earbuds",
  // AirBuddy stores multipart bud alerts through the left-bud entry when there is no `main` part.
  // Label it honestly for the user; the underlying position is passed through untouched.
  "left bud": "Earbuds",
  "right bud": "Right Earbud",
  "charging case": "Charging Case",
};

const KIND_LABELS: Record<string, string> = {
  "low battery": "Low Battery",
  charged: "Charged",
};

interface AlertValue {
  enabled: boolean;
  threshold: string;
}

function rowKey(alert: BatteryAlert): string {
  return `${alert.kind}|${alert.position}`;
}

export function BatteryAlertsForm({ device }: { device: Device }) {
  const { pop } = useNavigation();
  const [isSaving, setIsSaving] = useState(false);

  const [values, setValues] = useState(() => {
    const initial: Record<string, AlertValue> = {};
    for (const alert of device.alerts) {
      initial[rowKey(alert)] = {
        enabled: alert.enabled,
        threshold: String(Math.round(alert.threshold)),
      };
    }
    return initial;
  });

  /**
   * Always read a row's value through here, never `values[key]` directly.
   *
   * `values` is seeded once, in a useState initializer. The parent re-renders every 5s with a fresh
   * `device` prop, so if AirBuddy ever reports an alert this form didn't start with, `values[key]`
   * is `undefined` and `.enabled` throws a TypeError — crashing the form rather than showing a row.
   * Falling back to the alert's own current values is both crash-proof and correct.
   */
  function valueFor(alert: BatteryAlert): AlertValue {
    return (
      values[rowKey(alert)] ?? {
        enabled: alert.enabled,
        threshold: String(Math.round(alert.threshold)),
      }
    );
  }

  async function handleSave() {
    // Validate before dispatching — AirBuddy may silently reject a bad value.
    for (const alert of device.alerts) {
      const raw = valueFor(alert);
      const threshold = Number(raw.threshold);
      if (!Number.isFinite(threshold) || threshold < 0 || threshold > 100) {
        await showFailure(
          "Invalid threshold",
          `${KIND_LABELS[alert.kind]} · ${POSITION_LABELS[alert.position]} must be a number from 0 to 100.`,
        );
        return;
      }
    }

    setIsSaving(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Saving alerts…" });

    // NOT ATOMIC. These are N independent fire-and-forget calls; AirBuddy offers no transaction.
    // If one fails, earlier ones have already applied — say so rather than pretending otherwise.
    const applied: string[] = [];
    try {
      for (const alert of device.alerts) {
        const raw = valueFor(alert);
        const threshold = Number(raw.threshold);

        const unchanged = alert.enabled === raw.enabled && Math.round(alert.threshold) === threshold;
        if (unchanged) continue;

        await setBatteryAlert(device.id, alert.kind, alert.position, threshold, raw.enabled);
        applied.push(`${KIND_LABELS[alert.kind]} · ${POSITION_LABELS[alert.position]}`);
      }

      toast.style = Toast.Style.Success;
      toast.title = applied.length > 0 ? "Alerts saved" : "No changes";
      pop();
    } catch (error) {
      const detail =
        applied.length > 0 ? `Applied: ${applied.join(", ")}. The rest did not save.` : "No changes were applied.";
      await showFailure(`Couldn't save all alerts. ${detail}`, error);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleReset() {
    // AirBuddy 911's sdef: "disabled default alert records remain available and can be configured
    // again" — live-verified this resets every alert on the device to its disabled default rather
    // than removing the records. Still worth confirming: it discards whatever thresholds/enabled
    // state the user has set, even though the records themselves survive.
    const confirmed = await confirmAlert({
      title: "Reset Alerts to Defaults?",
      message: `This resets every battery alert for ${device.name} to its disabled default. Your current thresholds and enabled state will be lost, but the alert records themselves are not deleted — AirBuddy documents them as reconfigurable afterward.`,
      primaryAction: { title: "Reset", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    setIsSaving(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Resetting alerts…" });

    try {
      await deleteBatteryAlerts(device.id);
      toast.style = Toast.Style.Success;
      toast.title = "Alerts reset to defaults";
      pop();
    } catch (error) {
      await showFailure("Couldn't reset alerts", error);
    } finally {
      setIsSaving(false);
    }
  }

  if (device.alerts.length === 0) {
    return (
      <Form>
        <Form.Description title="No Alerts" text={`AirBuddy doesn't report any battery alerts for ${device.name}.`} />
      </Form>
    );
  }

  return (
    <Form
      isLoading={isSaving}
      navigationTitle={`Battery Alerts — ${device.name}`}
      actions={
        <ActionPanel>
          <Action
            title="Save Alerts"
            icon={Icon.Check}
            shortcut={Keyboard.Shortcut.Common.Save}
            onAction={handleSave}
          />
          <ActionPanel.Section>
            <Action
              title="Reset Alerts to Defaults"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={Keyboard.Shortcut.Common.RemoveAll}
              onAction={handleReset}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      {device.alerts.map((alert) => {
        const key = rowKey(alert);
        const label = `${KIND_LABELS[alert.kind]} · ${POSITION_LABELS[alert.position]}`;
        return (
          <Fragment key={key}>
            <Form.Checkbox
              id={`${key}-enabled`}
              label={label}
              value={valueFor(alert).enabled}
              onChange={(enabled) => setValues((v) => ({ ...v, [key]: { ...valueFor(alert), enabled } }))}
            />
            <Form.TextField
              id={`${key}-threshold`}
              title="Threshold (%)"
              placeholder="0–100"
              value={valueFor(alert).threshold}
              onChange={(threshold) => setValues((v) => ({ ...v, [key]: { ...valueFor(alert), threshold } }))}
            />
          </Fragment>
        );
      })}
    </Form>
  );
}
