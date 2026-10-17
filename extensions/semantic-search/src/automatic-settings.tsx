import { useEffect, useRef, useState } from "react";
import {
  Form,
  LaunchType,
  launchCommand,
  showToast,
  Toast,
} from "@raycast/api";
import {
  AutomaticStatus,
  automaticDefaults,
  automaticSummary,
  preferenceKey,
} from "./automatic-client";
import { getLauncherOwner } from "./launcher";

export function useAutomaticSettings(
  baseURL: string,
  server: AutomaticStatus | undefined,
  updateJob: (job: { state: string }) => void,
  canActivate: () => boolean,
) {
  const [draft, setDraft] = useState(automaticDefaults);
  const [status, setStatus] = useState(automaticDefaults);
  const [saving, setSaving] = useState(false);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const baseline = useRef<AutomaticStatus | undefined>(undefined);
  useEffect(() => {
    if (!server || server.revision < (baseline.current?.revision || 0)) return;
    const previous = baseline.current;
    setDraft((current) =>
      !previous || preferenceKey(current) === preferenceKey(previous)
        ? server
        : current,
    );
    baseline.current = server;
    setStatus(server);
  }, [server]);
  const dirty =
    preferenceKey(draft) !==
    preferenceKey(baseline.current || automaticDefaults);
  const activationSafe = () =>
    canActivate() &&
    preferenceKey(draftRef.current) ===
      preferenceKey(baseline.current || automaticDefaults);
  const activate = async () => {
    if (!activationSafe()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Save your edits first",
        message:
          "Background activation opens another command. Save or discard your edits, then activate checks in Actions.",
      });
      return;
    }
    try {
      await launchCommand({
        name: "automatic-index",
        type: LaunchType.UserInitiated,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Activate background checks",
        message: `Run Check for Library Updates once from the launcher. ${String(error)}`,
      });
    }
  };
  const save = async () => {
    if (saving) return;
    const submitted = { ...draft };
    setSaving(true);
    try {
      const launcher = submitted.enabled
        ? await getLauncherOwner(true)
        : undefined;
      const response = await fetch(`${baseURL}/v1/automatic`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: submitted.enabled,
          interval_seconds: submitted.interval_seconds,
          only_on_power: submitted.only_on_power,
          launcher,
        }),
      });
      const data = (await response.json()) as AutomaticStatus & {
        detail?: string;
      };
      if (!response.ok)
        throw new Error(data.detail || "Could not save automatic updates");
      baseline.current = data;
      setStatus(data);
      setDraft((current) =>
        preferenceKey(current) === preferenceKey(submitted) ? data : current,
      );
      await showToast({
        style: Toast.Style.Success,
        title: "Automatic updates saved",
      });
      if (data.enabled) {
        if (activationSafe()) await activate();
        else
          await showToast({
            style: Toast.Style.Success,
            title: "Automatic settings saved",
            message:
              "Newer or other edits are still unapplied. Save or discard them, then choose Activate Background Checks in Actions.",
          });
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not enable automatic updates",
        message: String(error),
      });
    } finally {
      setSaving(false);
    }
  };
  const control = async (action: "pause" | "resume") => {
    try {
      const launcher =
        action === "resume" ? await getLauncherOwner(true) : undefined;
      const response = await fetch(`${baseURL}/v1/index/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ launcher }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.detail || "Could not update indexing");
      if (data.job) updateJob(data.job);
      else if (
        ["indexing", "paused", "complete", "cancelled"].includes(data.state)
      )
        updateJob(data);
      await showToast({
        style: Toast.Style.Success,
        title:
          action === "pause"
            ? "Pausing indexing"
            : data.state === "waiting_for_power"
              ? "Waiting for external power"
              : "Resuming indexing",
        message:
          "Completed files remain indexed. Other library edits are still unapplied.",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not update indexing",
        message: String(error),
      });
    }
  };
  const fields = (
    <>
      <Form.Separator />
      <Form.Description
        title="Automatic updates"
        text={automaticSummary(status)}
      />
      <Form.Checkbox
        id="automatic_enabled"
        label="Update the index in the background"
        value={draft.enabled}
        onChange={(enabled) => setDraft((value) => ({ ...value, enabled }))}
      />
      {draft.enabled && (
        <>
          <Form.Dropdown
            id="automatic_interval"
            title="Update every"
            value={String(draft.interval_seconds)}
            onChange={(interval) =>
              setDraft((value) => ({
                ...value,
                interval_seconds: Number(interval),
              }))
            }
          >
            <Form.Dropdown.Item value="1800" title="30 minutes" />
            <Form.Dropdown.Item value="3600" title="1 hour" />
            <Form.Dropdown.Item value="10800" title="3 hours" />
            <Form.Dropdown.Item value="21600" title="6 hours" />
            <Form.Dropdown.Item value="86400" title="24 hours" />
          </Form.Dropdown>
          <Form.Checkbox
            id="automatic_power"
            label="Only while connected to power"
            value={draft.only_on_power}
            onChange={(only_on_power) =>
              setDraft((value) => ({ ...value, only_on_power }))
            }
          />
          <Form.Description text="Runs while Tinycast or Raycast is running. Closing its window is fine. Completed files are reused after interruptions. Save to activate the launcher's background checks." />
        </>
      )}
    </>
  );
  return {
    fields,
    dirty,
    saving,
    save,
    control,
    activate,
    enabled: status.enabled,
    paused: status.paused,
  };
}
