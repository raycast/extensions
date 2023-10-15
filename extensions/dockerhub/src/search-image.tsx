import Search from "./components/Search";
import { SearchTypeEnum } from "./lib/hub/types";

export default function Command() {
  return <Search searchType={SearchTypeEnum.IMAGE} />;
}
