import { List, ActionPanel, Action, showToast, Toast, closeMainWindow, environment, Icon } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import { join } from "path";

const execAsync = promisify(exec);

export default function Command() {
  async function handleAction(source: "mac" | "external" | "off") {
    try {
      const scriptPath = join(environment.assetsPath, "mirror.swift");
      await execAsync(`swift "${scriptPath}" ${source}`);
      await showToast({ title: "Display mirroring configured", style: Toast.Style.Success });
      await closeMainWindow();
    } catch (error: unknown) {
      console.error(error);
      const e = error as { stdout?: string; stderr?: string; toString: () => string };
      const output = (e.stdout || "") + "\n" + (e.stderr || "");
      if (output.includes("No external displays detected")) {
        await showToast({ title: "No external display found", style: Toast.Style.Failure });
      } else {
        await showToast({ title: "Failed to configure mirroring", message: String(e), style: Toast.Style.Failure });
      }
    }
  }

  return (
    <List>
      <List.Item
        icon={Icon.Desktop}
        title="Mac -> External"
        subtitle="Mirror the MacBook screen onto the external display"
        actions={
          <ActionPanel>
            <Action title="Select" icon={Icon.Desktop} onAction={() => handleAction("mac")} />
          </ActionPanel>
        }
      />
      <List.Item
        icon={Icon.Monitor}
        title="External -> Mac"
        subtitle="Mirror the external display onto the MacBook screen"
        actions={
          <ActionPanel>
            <Action title="Select" icon={Icon.Monitor} onAction={() => handleAction("external")} />
          </ActionPanel>
        }
      />
      <List.Item
        icon={Icon.XMarkCircle}
        title="Turn Off Mirroring"
        subtitle="Stop mirroring and use displays separately (Extended)"
        actions={
          <ActionPanel>
            <Action title="Select" icon={Icon.XMarkCircle} onAction={() => handleAction("off")} />
          </ActionPanel>
        }
      />
    </List>
  );
}
