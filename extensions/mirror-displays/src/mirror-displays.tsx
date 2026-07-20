import { List, ActionPanel, Action, showToast, Toast, closeMainWindow, environment, Icon } from "@raycast/api";
import { execFile } from "child_process";
import { join } from "path";

const execFilePromise = (file: string, args: string[]) =>
  new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    execFile(file, args, (error, stdout, stderr) => {
      if (error) {
        reject({ error, stdout, stderr });
      } else {
        resolve({ stdout, stderr });
      }
    });
  });

async function handleAction(source: "mac" | "external" | "off") {
  const scriptPath = join(environment.assetsPath, "mirror.swift");
  try {
    await execFilePromise("swift", [scriptPath, source]);
    await showToast({ title: "Display mirroring configured", style: Toast.Style.Success });
    await closeMainWindow();
  } catch (err: unknown) {
    console.error(err);
    const e = err as { error?: Error; stdout?: string; stderr?: string };
    const output = `${e.stdout ?? ""}\n${e.stderr ?? ""}`;
    if (output.includes("No external displays detected")) {
      await showToast({ title: "No external display found", style: Toast.Style.Failure });
      return;
    }
    if (output.includes("Could not find the internal Mac display")) {
      await showToast({ title: "Internal display not found", style: Toast.Style.Failure });
      return;
    }
    const message = e.error?.message ?? String(err);
    await showToast({ title: "Failed to configure mirroring", message, style: Toast.Style.Failure });
  }
}

export default function Command() {
  return (
    <List isLoading={false}>
      <List.Item
        icon={Icon.Desktop}
        title="Mac → External"
        subtitle="Mirror the MacBook screen onto the primary external display (uses first external when multiple connected)"
        actions={
          <ActionPanel>
            <Action title="Mirror Mac to External" icon={Icon.Desktop} onAction={() => handleAction("mac")} />
          </ActionPanel>
        }
      />
      <List.Item
        icon={Icon.Monitor}
        title="External → Mac"
        subtitle="Mirror the primary external display onto the MacBook screen (uses first external when multiple connected)"
        actions={
          <ActionPanel>
            <Action title="Mirror External to Mac" icon={Icon.Monitor} onAction={() => handleAction("external")} />
          </ActionPanel>
        }
      />
      <List.Item
        icon={Icon.XMarkCircle}
        title="Turn Off Mirroring"
        subtitle="Stop mirroring and use displays separately (Extended) — applies to all displays"
        actions={
          <ActionPanel>
            <Action title="Disable Mirroring" icon={Icon.XMarkCircle} onAction={() => handleAction("off")} />
          </ActionPanel>
        }
      />
    </List>
  );
}
