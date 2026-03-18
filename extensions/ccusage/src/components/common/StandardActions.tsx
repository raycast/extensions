import { Action, Icon, openExtensionPreferences } from "@raycast/api";
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
    <>
      <Action.CopyToClipboard title="Copy ccusage Command" content={getCCUsageCommand()} icon={Icon.Clipboard} />
      <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />

      {customActions}

      {externalLinks && externalLinks.length > 0 && (
        <>
          {externalLinks.map((link, idx) => (
            <Action.OpenInBrowser
              key={`${link.url}-${link.title}-${idx}`}
              title={link.title}
              url={link.url}
              icon={link.icon}
            />
          ))}
        </>
      )}
    </>
  );
}
