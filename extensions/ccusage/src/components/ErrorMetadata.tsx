import { List, Icon } from "@raycast/api";
import { ReactNode } from "react";

type ErrorMetadataProps = {
  error?: Error | string;
  noDataMessage?: string;
  noDataSubMessage?: string;
};

export function ErrorMetadata({ error, noDataMessage, noDataSubMessage }: ErrorMetadataProps): ReactNode {
  if (error) {
    return (
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label title="Error" text="ccusage command failed" icon={Icon.ExclamationMark} />
        <List.Item.Detail.Metadata.Separator />
        <List.Item.Detail.Metadata.Label title="Setup Guide" text="1. Run 'npx ccusage@latest' in Terminal" />
        <List.Item.Detail.Metadata.Label title="Next Step" text="2. Find path with 'which npx'" />
        <List.Item.Detail.Metadata.Label title="Configuration" text="3. Add path to Extension Preferences" />
        <List.Item.Detail.Metadata.Separator />
        <List.Item.Detail.Metadata.Label title="Quick Fix" text="Open Preferences (Cmd+Shift+,)" icon={Icon.Gear} />
      </List.Item.Detail.Metadata>
    );
  }

  if (noDataMessage) {
    return (
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label title="Status" text={noDataMessage} icon={Icon.Circle} />
        {noDataSubMessage && (
          <>
            <List.Item.Detail.Metadata.Separator />
            <List.Item.Detail.Metadata.Label title="Note" text={noDataSubMessage} />
          </>
        )}
      </List.Item.Detail.Metadata>
    );
  }

  return null;
}
