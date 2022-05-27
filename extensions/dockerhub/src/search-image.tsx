import { Search } from "./search";
import { SearchType } from "./lib/api";

export default function Command() {
  return <Search searchType={SearchType.IMAGE} />;
}
