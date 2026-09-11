import { SearchTabsBase } from "./components/search-tabs-base";

export default function SearchCurrentSpaceTabs() {
  return (
    <SearchTabsBase
      command="search-current-space-tabs"
      scope={{ kind: "current" }}
    />
  );
}
