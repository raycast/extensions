import { ActionPanel, Action, Icon, Detail, Clipboard, Toast, showToast } from "@raycast/api";
import { useStreamerMode } from "../../../utils/useStreamerMode";
import { maskSecretIfEnabled } from "../../../utils/maskSensitiveData";
import { StreamerModeAction } from "../../../components/StreamerModeAction";
import { useMemo, useRef } from "react";

interface SecretValueViewProps {
  secretId: string;
  version: string;
  value: string;
  onBack: () => void;
}

export default function SecretValueView({ secretId, version, value, onBack }: SecretValueViewProps) {
  const { isEnabled: isStreamerMode } = useStreamerMode();
  const clipboardTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const markdown = useMemo(() => {
    const displayValue = maskSecretIfEnabled(value, isStreamerMode);
    if (isStreamerMode) {
      return `# Secret Value\n\n\`\`\`\n${displayValue}\n\`\`\`\n\n> **Streamer Mode**: Secret value is masked. Toggle Streamer Mode (Cmd+Shift+H) to reveal.`;
    }
    return `# Secret Value\n\n\`\`\`\n${displayValue}\n\`\`\`\n\n> **Security Notice**: This value will be automatically cleared from your clipboard in 30 seconds after copying.`;
  }, [value, isStreamerMode]);

  const handleCopy = async () => {
    await Clipboard.copy(value);
    showToast({
      style: Toast.Style.Success,
      title: "Value copied",
      message: isStreamerMode ? "Secret copied (masked in view)" : "Secret value copied to clipboard",
    });

    // Clear any existing timeout
    if (clipboardTimeoutRef.current) {
      clearTimeout(clipboardTimeoutRef.current);
    }

    // Auto-clear clipboard after 30 seconds
    clipboardTimeoutRef.current = setTimeout(async () => {
      try {
        const currentClipboard = await Clipboard.readText();
        if (currentClipboard === value) {
          await Clipboard.copy("");
          showToast({
            style: Toast.Style.Success,
            title: "Clipboard cleared",
            message: "Secret value has been automatically cleared for security",
          });
        }
      } catch {
        // Silently fail if clipboard access is denied
      }
    }, 30000);
  };

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`Secret Value - ${secretId} (v${version})`}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Actions">
            <Action
              title="Copy to Clipboard"
              icon={Icon.Clipboard}
              onAction={handleCopy}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Privacy">
            <StreamerModeAction />
          </ActionPanel.Section>
          <ActionPanel.Section title="Navigation">
            <Action title="Back" icon={Icon.ArrowLeft} onAction={onBack} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
