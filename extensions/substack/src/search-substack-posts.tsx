import { useState } from "react";

import { List } from "@raycast/api";

import type { Language, Post } from "@/types";
import { SearchType } from "@/types";

import useSearchApi from "@/hooks/useSearchApi";
import useShowDetails from "@/hooks/useShowDetails";
import useThrottledQuery from "@/hooks/useThrottledQuery";

import LanguageDropdown from "@/components/LanguageDropdown";
import PostItem from "@/components/PostItem";

export default function SearchSubstackPosts() {
  const [language, setLanguage] = useState<Language>();
  const [query, setQuery, unEqual] = useThrottledQuery();
  const { showDetails, setShowDetails } = useShowDetails(query);

  const { data, isLoading, pagination } = useSearchApi<Post>(SearchType.Posts, query, language);

  return (
    <List
      isLoading={isLoading || unEqual}
      pagination={pagination}
      searchBarPlaceholder="Search Substack"
      searchBarAccessory={<LanguageDropdown onLanguageChange={setLanguage} />}
      onSearchTextChange={setQuery}
      isShowingDetail={showDetails}
      throttle
    >
      {data?.map((post) => (
        <PostItem
          key={post._id}
          post={post}
          toggleDetails={() => setShowDetails((s) => !s)}
          detailsShown={showDetails}
        />
      ))}
      {!isLoading ? (
        <List.EmptyView title={query === "" ? "Search Posts" : "No posts found"} icon={{ source: "substack.svg" }} />
      ) : (
        <List.EmptyView title="Searching..." icon={{ source: "substack.svg" }} />
      )}
    </List>
  );
}
