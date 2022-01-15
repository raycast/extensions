import { Search } from "./search";
import { SearchType } from "./lib/api";

interface SearchTagProps {
  image: string;
}

export function SearchTag(props: SearchTagProps) {
  return <Search searchType={SearchType.TAG} image={props.image} />;
}
