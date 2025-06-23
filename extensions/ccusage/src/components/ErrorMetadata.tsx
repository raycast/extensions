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
        <List.Item.Detail.Metadata.Label title="Error" text="ccusage is not available" icon={Icon.ExclamationMark} />
        <List.Item.Detail.Metadata.Label title="Solution" text="Please configure JavaScript runtime in Preferences" />
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
