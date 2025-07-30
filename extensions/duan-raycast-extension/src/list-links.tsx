import { List } from "@raycast/api";
import { useState } from "react";
import { useLinks } from "./hooks/useLinks";
import { LinkItem } from "./components/LinkItem";
import { searchLinks } from "./services/search";

interface LaunchProps {
  launchContext?: {
    searchText?: string;
  };
}

export default function Command(props: LaunchProps) {
  const { data: links, isLoading, revalidate } = useLinks();
  const [keyword, setKeyword] = useState(props.launchContext?.searchText || "");

  const filteredLinks = searchLinks(links, keyword);

  return (
    <List
      searchBarPlaceholder="Search by Slug, URL or Description"
      isLoading={isLoading}
      onSearchTextChange={setKeyword}
      searchText={keyword}
      filtering={false} // Disable Raycast's built-in filtering
      throttle // Optimize performance with throttling
    >
      {filteredLinks.map((link) => (
        <LinkItem key={link.short_code} link={link} onRefresh={revalidate} />
      ))}
    </List>
  );
}
