import { List, Icon } from "@raycast/api";

export function ErrorEmptyView({
  message,
  title = "Failed to load data",
}: {
  message: string;
  title?: string;
}) {
  return (
    <List.EmptyView
      title={title}
      description={message}
      icon={Icon.ExclamationMark}
    />
  );
}

export function NoResultsEmptyView({
  message = "Try a different search query",
}: { message?: string } = {}) {
  return (
    <List.EmptyView
      title="No results found"
      description={message}
      icon={Icon.MagnifyingGlass}
    />
  );
}
