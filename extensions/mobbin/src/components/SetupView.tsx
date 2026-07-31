import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  openExtensionPreferences,
} from "@raycast/api";
import type { ReactNode } from "react";

type Props = {
  title: string;
  message: string;
  children?: ReactNode;
};

export function SetupView({ title, message, children }: Props) {
  return (
    <Detail
      markdown={`# ${title}\n\n${message}`}
      actions={
        <ActionPanel>
          {children}
          <Action
            title="Open Extension Preferences"
            icon={Icon.Gear}
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      }
    />
  );
}
