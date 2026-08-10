import { List } from "@raycast/api";

interface IListWithEmptyProps {
  loading: boolean;
  showNoResultsFound: boolean;
}

export const ListWithEmptyView = ({ loading, showNoResultsFound }: IListWithEmptyProps) => {
  if (loading) {
    return <List.EmptyView title={"Loading..."} icon={{ source: "icon-small.png" }} />;
  }

  return (
    <List.EmptyView title={!showNoResultsFound ? "Type to search" : "No Results"} icon={{ source: "icon-small.png" }} />
  );
};
