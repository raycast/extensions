import { Action, ActionPanel, Detail, Icon, Keyboard, open } from "@raycast/api";
import nativeHelpers from "../assets/native-helpers.json";
import type { RuntimeStatus } from "./runtime-environment";

const accessibilitySettings = "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility";

export function RuntimeSetupView({ status, onCheck }: { status: RuntimeStatus; onCheck: () => void }) {
  const markdown = {
    checking: "# App Hopper\n\nChecking setup…",
    ready: "# App Hopper\n\nReady.",
    accessibility:
      "# Allow Accessibility Access\n\nEnable Raycast in System Settings → Privacy & Security → Accessibility, then choose Check Again.",
    "developer-tools":
      "# Install Command Line Tools\n\nThis installation needs Apple's Command Line Tools. Run the command below, finish installation, then choose Check Again.\n\n```sh\nxcode-select --install\n```",
    unsupported: `# Unsupported System\n\nApp Hopper requires macOS ${nativeHelpers.minimumMacOS} or later and a compatible version of Raycast.`,
    error: "# App Hopper Could Not Start\n\nChoose Check Again. If the problem continues, reinstall the extension.",
  }[status.kind];
  return (
    <Detail
      navigationTitle="App Hopper Setup"
      markdown={markdown}
      isLoading={status.kind === "checking"}
      actions={
        <ActionPanel>
          {status.kind === "accessibility" && (
            <Action title="Open Accessibility Settings" icon={Icon.Gear} onAction={() => open(accessibilitySettings)} />
          )}
          {status.kind === "developer-tools" && (
            <Action.CopyToClipboard title="Copy Installation Command" content="xcode-select --install" />
          )}
          <Action
            title="Check Again"
            icon={Icon.Repeat}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={onCheck}
          />
        </ActionPanel>
      }
    />
  );
}
