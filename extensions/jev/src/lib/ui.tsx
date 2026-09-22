import {
  Action,
  launchCommand,
  LaunchType,
  ActionPanel,
  Detail,
  Icon,
  Toast,
  environment,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { ZodError } from "zod";
import { useEffect, useState } from "react";
import { Store } from "./store";
import SetupJev from "../setup-jev";
import { initialData, type Data } from "./model";
import { evaluate } from "./client";
import type { WireQuestion } from "./questions";
export const store = new Store(environment.supportPath);
export function useData() {
  const [data, setData] = useState<Data>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  async function refresh() {
    try {
      setData(await store.read());
      setError(undefined);
    } catch (e) {
      setError(message(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  async function update(change: (d: Data) => void | Promise<void>) {
    const next = await store.update(change);
    setData(next);
  }
  return { data, loading, error, refresh, update };
}
export function message(e: unknown) {
  const code = (e as NodeJS.ErrnoException | null)?.code;
  if (code === "ENOENT")
    return "This file or folder is no longer available. Reconnect the drive or choose another location.";
  if (code === "EACCES" || code === "EPERM")
    return "macOS denied access. Choose a folder you can write to, or allow Raycast access in System Settings, then retry.";
  if (code === "EEXIST") return "A file with that name already exists at the destination. Nothing was overwritten.";
  if (code === "ENOSPC") return "There is not enough free disk space. Free up space, then retry.";

  if (e instanceof ZodError)
    return e.issues
      .slice(0, 3)
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
  return e instanceof Error ? e.message : String(e);
}
export async function report(e: unknown) {
  await showToast({ style: Toast.Style.Failure, title: "Could not complete action", message: message(e) });
}
export async function task(title: string, fn: () => Promise<void>) {
  const toast = await showToast({ style: Toast.Style.Animated, title });
  try {
    await fn();
    toast.style = Toast.Style.Success;
    toast.title = "Done";
  } catch (e) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not complete action";
    toast.message = message(e);
  }
}
export function ErrorView({ error }: { error: string }) {
  return (
    <Detail
      markdown={`# Unable to load Jev\n\n${error}`}
      actions={
        <ActionPanel>
          <Action
            title="Recover from Backup"
            onAction={() => launchCommand({ name: "backup-restore", type: LaunchType.UserInitiated })}
          />
          <Action
            title="Try Again"
            onAction={() => launchCommand({ name: environment.commandName, type: LaunchType.UserInitiated })}
          />
          <Action title="Open Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
export function PreferencesAction() {
  return (
    <>
      <Action.Push title="Set up Jev" icon={Icon.Gear} target={<SetupJev />} />
      <Action title="Open Jev Preferences" onAction={openExtensionPreferences} />
      <Action
        title="Backup and Restore"
        onAction={() => launchCommand({ name: "backup-restore", type: LaunchType.UserInitiated })}
      />
    </>
  );
}
export async function askJev(state: unknown, questions: Record<string, WireQuestion>, signal?: AbortSignal) {
  const p = getPreferenceValues<{ apiKey?: string; model?: string }>();
  return evaluate(p.apiKey ?? "", p.model ?? "jev-latest", state, questions, signal);
}
export const markdown = (s: string) => s.replace(/[\\`*_{}[\]<>#|]/g, "\\$&");
