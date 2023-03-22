import { ListView } from "./conponents";
import { useSearch } from "./hooks";
import { namedConst } from "./utils/string";

export default function Command() {
  const { data, isLoading, setSearchText } = useSearch();
  const res: SearchResult[] = data.map((item) => {
    item.title = namedConst(item.title);
    return item;
  });
  console.log("Output ~ constres:SearchResult[]=data.map ~ res:", res);

  return ListView(res, isLoading, setSearchText);
}
