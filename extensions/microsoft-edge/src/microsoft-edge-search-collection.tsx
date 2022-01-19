import { ReactElement } from "react";
import { SearchUrlList } from "./components/SearchUrlList";
import { useCollectionSearch } from "./hooks/useCollectionSearch";

export default function Command(): ReactElement {
  return SearchUrlList(useCollectionSearch);
}
