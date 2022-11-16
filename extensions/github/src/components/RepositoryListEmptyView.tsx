import { List } from "@raycast/api";
import { random } from "lodash";

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
  return (
    <List.EmptyView
      title={
        searchText.length > 0 && !isLoading
          ? "No repositories found"
          : `Type query e.g "${sampleQueries[random(0, sampleQueries.length - 1)]}"`
      }
    />
  );
}
