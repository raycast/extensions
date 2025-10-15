import { Icon, List, ActionPanel, Action } from "@raycast/api";
import { memo, useMemo } from "react";
import { EntryType } from "../types";
import { userName, formatTags } from "../utils";

interface EntryItemProps {
  entry: EntryType;
  isShowingDetail: boolean;
  onToggleDetail: () => void;
  onCancel?: () => void;
}

export const EntryItem = memo<EntryItemProps>(
  ({ entry, isShowingDetail, onToggleDetail, onCancel }: EntryItemProps) => {
    const detailMetadata = useMemo(
      () => (
        <List.Item.Detail.Metadata>
          {entry.description && (
            <>
              <List.Item.Detail.Metadata.Label title="Description" />
              <List.Item.Detail.Metadata.Label title={entry.description} />
              <List.Item.Detail.Metadata.Separator />
            </>
          )}
          {entry.tags && entry.tags.length > 0 && (
            <>
              <List.Item.Detail.Metadata.Label
                title="Tags"
                text={formatTags(entry.tags)}
              />
              <List.Item.Detail.Metadata.Separator />
            </>
          )}
          {entry.date && (
            <>
              <List.Item.Detail.Metadata.Label title="Date" text={entry.date} />
              <List.Item.Detail.Metadata.Separator />
            </>
          )}
          {entry.project && (
            <>
              <List.Item.Detail.Metadata.Label
                title="Project"
                text={entry.project.name}
              />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Enabled"
                text={entry.project.enabled ? "Yes" : "No"}
              />
              <List.Item.Detail.Metadata.Separator />
            </>
          )}
          <List.Item.Detail.Metadata.Label
            title="Billable"
            text={entry.billable ? "Yes" : "No"}
          />
          <List.Item.Detail.Metadata.Separator />
          {entry.user && (
            <>
              <List.Item.Detail.Metadata.Label
                title="User"
                icon={entry.user.profile_image_url}
                text={userName(entry.user)}
              />
              <List.Item.Detail.Metadata.Separator />
            </>
          )}
          {entry.approved_by && (
            <>
              <List.Item.Detail.Metadata.Label
                title="Approved By"
                icon={entry.approved_by.profile_image_url}
                text={userName(entry.approved_by)}
              />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Approved At"
                text={entry.approved_at}
              />
              <List.Item.Detail.Metadata.Separator />
            </>
          )}
        </List.Item.Detail.Metadata>
      ),
      [entry],
    );

    return (
      <List.Item
        key={entry.id}
        title={entry.project.name}
        subtitle={entry.formatted_minutes}
        icon={{
          source: Icon.CircleFilled,
          tintColor: entry.project.color,
        }}
        detail={<List.Item.Detail metadata={detailMetadata} />}
        actions={
          <ActionPanel>
            <Action
              title={isShowingDetail ? "Hide Details" : "Show Details"}
              onAction={onToggleDetail}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
            />
            {onCancel && (
              <Action
                title="Back"
                icon={Icon.ArrowLeft}
                onAction={onCancel}
                shortcut={{ modifiers: ["cmd"], key: "[" }}
              />
            )}
          </ActionPanel>
        }
      />
    );
  },
);

EntryItem.displayName = "EntryItem";
