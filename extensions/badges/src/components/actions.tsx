import { Action, ActionPanel, Icon, getPreferenceValues } from "@raycast/api";
import { Badge, OnBadgeChange } from "../types.js";
import { pickLogo } from "../utils.js";

export const Documentation = ({ title, url }: { title: string; url: string }) => (
  <ActionPanel.Section>
    <Action.OpenInBrowser title={title} url={url} />
  </ActionPanel.Section>
);

export const GeneralActions = ({
  defaultBadge,
  badgeUrl,
  documentationUrl,
  onBadgeChange,
}: {
  defaultBadge: Badge;
  badgeUrl: URL;
  documentationUrl: string;
  onBadgeChange: OnBadgeChange;
}) => {
  const { resetOnCopy } = getPreferenceValues<ExtensionPreferences>();
  const reset = () => onBadgeChange(defaultBadge);

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.CopyToClipboard
          title="Copy URL to Clipboard"
          content={badgeUrl.toString()}
          onCopy={() => {
            if (resetOnCopy) reset();
          }}
        />
        <Action icon={Icon.Emoji} title="Edit Logo" shortcut={{ modifiers: ["cmd"], key: "l" }} onAction={pickLogo} />
        <Action icon={Icon.Undo} title="Reset" shortcut={{ modifiers: ["cmd"], key: "r" }} onAction={reset} />
      </ActionPanel.Section>
      <Documentation title="API Documentation" url={documentationUrl} />
    </ActionPanel>
  );
};
