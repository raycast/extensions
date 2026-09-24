import { useState } from "react";
import { SearchMemosList } from "./components/SearchMemosList";
import { getConfiguredInstanceUrl } from "./helpers/preferences";
import { type MemoScope, useMemos } from "./hooks/useMemos";

const SearchMemosCommand = () => {
  const [scope, setScope] = useState<MemoScope>("mine");
  const [searchText, setSearchText] = useState("");
  const { memos, isLoading, errorMessage, pagination, revalidate, currentUserName } = useMemos(scope, searchText);

  return (
    <SearchMemosList
      memos={memos}
      isLoading={isLoading}
      errorMessage={errorMessage}
      searchText={searchText}
      instanceUrl={getConfiguredInstanceUrl()}
      currentUserName={currentUserName}
      pagination={pagination}
      onSearchTextChange={setSearchText}
      onScopeChange={setScope}
      onReload={revalidate}
    />
  );
};

export default SearchMemosCommand;
