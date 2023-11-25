import { List } from "@raycast/api";
import { random } from "lodash";
import { useMemo } from "react";

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
};

export default function RepositoryListEmptyView({ searchText, isLoading }: RepositoryListEmptyViewProps) {
  const example = useMemo(() => sampleQueries[random(0, sampleQueries.length - 1)], []);

  if (searchText.length > 0 && !isLoading) {
    return <List.EmptyView title="No repositories found" />;
  }

  return <List.EmptyView title={`Type query e.g "${example}"`} />;
}
