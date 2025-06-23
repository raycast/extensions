import { ActionPanel, Action, Icon, openExtensionPreferences } from "@raycast/api";
import { ReactNode } from "react";
import { copyToClipboard, getCCUsageCommand } from "../../utils/data-formatter";

export type ExternalLink = {
  title: string;
  url: string;
  icon: Icon;
};

type StandardActionsProps = {
  customActions?: ReactNode;
  externalLinks?: ExternalLink[];
};
export function StandardActions({ customActions, externalLinks }: StandardActionsProps) {
  return (
    <ActionPanel>
      <Action
        title="Copy Ccusage Command"
        icon={Icon.Clipboard}
        onAction={() => copyToClipboard(getCCUsageCommand(), "Copied ccusage command to clipboard")}
      />
      <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />

      {customActions}

      {externalLinks && externalLinks.length > 0 && (
        <ActionPanel.Section>
          {externalLinks.map((link) => (
            <Action.OpenInBrowser key={link.url} title={link.title} url={link.url} icon={link.icon} />
          ))}
        </ActionPanel.Section>
      )}
    </ActionPanel>
  );
}
