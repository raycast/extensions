import { ActionPanel, Action, Icon, openExtensionPreferences } from "@raycast/api";
import { ReactNode } from "react";
import { getCCUsageCommand } from "../../utils/data-formatter";

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
      <Action.CopyToClipboard title="Copy Ccusage Command" content={getCCUsageCommand()} icon={Icon.Clipboard} />
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
