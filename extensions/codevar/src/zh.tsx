import { LaunchProps } from "@raycast/api";
import { ListView } from "./conponents";
import { useSearch } from "./hooks";
import { hyphen } from "./utils/string";

export default function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const { queryText } = props.arguments;
  const { data, isLoading, setSearchText } = useSearch(queryText);
  const res: SearchResult[] = data.map((item) => {
    item.title = hyphen(item.title);
    return item;
  });

  return ListView(res, isLoading, setSearchText);
}
