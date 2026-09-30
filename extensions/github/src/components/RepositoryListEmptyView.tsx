import { Icon, List } from "@raycast/api";
import { random } from "lodash";
import { useMemo } from "react";

import { getErrorMessage } from "../helpers/errors";

const sampleQueries = [
  "apollo-11",
  "rails",
  "gridsome",
  "youtube-dl",
  "iterm2",
  "vscode",
  "textmate",
  "swift",
  "tensorflow",
  "grdb",
];

type RepositoryListEmptyViewProps = {
  searchText: string;
  isLoading: boolean;
  error?: unknown;
};

export default function RepositoryListEmptyView({ searchText, isLoading, error }: RepositoryListEmptyViewProps) {
  const example = useMemo(() => sampleQueries[random(0, sampleQueries.length - 1)], []);

  if (error) {
    return (
      <List.EmptyView icon={Icon.Warning} title="Failed to Load Repositories" description={getErrorMessage(error)} />
    );
  }

  if (searchText.length > 0 && isLoading) {
    return <List.EmptyView title="Searching repositories..." />;
  }

  if (searchText.length > 0 && !isLoading) {
    return <List.EmptyView title="No repositories found" />;
  }

  return <List.EmptyView title={`Type query e.g "${example}"`} />;
}
