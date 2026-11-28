import { Action, ActionPanel, Icon, Image, List, openExtensionPreferences } from "@raycast/api";
import { DownloadingEmptyView, ListStatus } from "./DownloadingList";

export const MIN_QUERY_LENGTH = 2;

export const SearchEmptyView = ({
  noun,
  icon,
  query,
  isLoading,
  listStatus,
  error,
  keyRejected = false,
}: {
  noun: "Games" | "Users";
  icon: Image.ImageLike;
  query: string;
  isLoading: boolean;
  listStatus?: ListStatus;
  error?: unknown;
  keyRejected?: boolean;
}) => {
  const text = query.trim();
  if (!text) return <List.EmptyView icon={icon} title={`Search Steam ${noun}`} />;
  if (text.length < MIN_QUERY_LENGTH) return <List.EmptyView icon={icon} title="Keep Typing" />;
  if (listStatus) return <DownloadingEmptyView status={listStatus} />;
  if (isLoading) return <List.EmptyView icon={icon} title="Searching…" />;
  if (error) {
    return (
      <List.EmptyView
        icon={Icon.ExclamationMark}
        title={`Could Not Search ${noun}`}
        description={error instanceof Error ? error.message : undefined}
        actions={
          keyRejected ? (
            <ActionPanel>
              <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
            </ActionPanel>
          ) : undefined
        }
      />
    );
  }
  return <List.EmptyView icon={icon} title={`No ${noun} Found`} />;
};
