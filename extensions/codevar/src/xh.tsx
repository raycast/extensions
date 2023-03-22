import { ListView } from "./conponents";
import { useSearch } from "./hooks";
import { underline } from "./utils/string";

export default function Command() {
  const { data, isLoading, setSearchText } = useSearch();
  const res: SearchResult[] = data.map((item) => {
    item.title = underline(item.title);
    return item;
  });

  return ListView(res, isLoading, setSearchText);
}
