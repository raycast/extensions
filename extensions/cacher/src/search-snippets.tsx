import { Icon, List } from "@raycast/api";
import { useMemo, useState } from "react";
import { ItemActions } from "./components/search-snippets/item-actions";
import { SearchBarAccessory } from "./components/search-snippets/search-bar-accessory";
import { ItemDetail } from "./components/search-snippets/item-detail";
import { useAuthFetch } from "./lib/hooks/use-auth-fetch";
import { SNIPPETS_FILTER } from "./lib/types/snippet-filters";
import { SnippetsResponse } from "./lib/types/snippets-response";
import {
  SnippetWithLibrary,
  getLabelsForSnippet,
  getSnippets,
  labelIcon,
  snippetFiles,
} from "./lib/utils/snippet-utils";
import { SnippetFile } from "./lib/types/snippet-file";
import AuthError from "./components/auth-error";
import { isForbidden } from "./lib/utils/errors";

function SnippetItem({
  response,
  snippet,
  file,
  isShowingDetail,
  setIsShowingDetail,
}: {
  response: SnippetsResponse | undefined;
  snippet: SnippetWithLibrary;
  file: SnippetFile;
  isShowingDetail: boolean;
  setIsShowingDetail: (val: boolean) => void;
}) {
  const privateIcon = snippet.isPrivate ? [{ icon: Icon.Lock }] : [];
  const snippetLabels = useMemo(() => getLabelsForSnippet(response, snippet), [response, snippet]);

  const label =
    snippetLabels.length > 0
      ? [
          {
            text: { value: snippetLabels[0].title },
            icon: labelIcon(snippetLabels[0]),
          },
        ]
      : [];

  return (
    <List.Item
      title={snippet.title}
      subtitle={isShowingDetail ? "" : file.content}
      actions={
        <ItemActions file={file} snippet={snippet} toggleShowingDetail={() => setIsShowingDetail(!isShowingDetail)} />
      }
      detail={<ItemDetail snippet={snippet} file={file} labels={snippetLabels} />}
      accessories={isShowingDetail ? privateIcon : [...label, ...privateIcon]}
    />
  );
}

export default function SearchSnippets() {
  const { data: response, error, isLoading } = useAuthFetch<SnippetsResponse>("snippets");

  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<SNIPPETS_FILTER>("all");
  const [isShowingDetail, setIsShowingDetail] = useState(false);

  const filteredSnippets = useMemo(() => {
    if (!response) {
      return [];
    }

    return getSnippets(response).filter((snippet) => {
      if (filter === "personal_all") {
        return snippet.libraryGuid === response.personalLibrary.guid;
      } else if (filter.includes("team_all_")) {
        const teamGuid = filter.replace("team_all_", "");
        return snippet.libraryGuid === teamGuid;
      } else if (filter.includes("label_")) {
        const labelGuid = filter.replace("label_", "");
        return getLabelsForSnippet(response, snippet).some((label) => label.guid === labelGuid);
      } else {
        return true;
      }
    });
  }, [response, filter]);

  const trimmedSearchQuery = searchQuery.trim().toLocaleLowerCase();
  const filteredFiles = useMemo(() => {
    const files = snippetFiles(filteredSnippets);

    if (trimmedSearchQuery.length === 0) {
      return files;
    }

    return files.filter((file) => {
      return (
        file.snippet.title.toLocaleLowerCase().includes(trimmedSearchQuery) ||
        file.snippet.description?.toLocaleLowerCase().includes(trimmedSearchQuery) ||
        file.content.toLocaleLowerCase().includes(trimmedSearchQuery) ||
        file.filename.toLocaleLowerCase().includes(trimmedSearchQuery)
      );
    });
  }, [filteredSnippets, trimmedSearchQuery]);

  if (isForbidden(error)) {
    return <AuthError />;
  }

  return (
    <List
      searchText={searchQuery}
      onSearchTextChange={setSearchQuery}
      isShowingDetail={isShowingDetail}
      isLoading={isLoading}
      searchBarPlaceholder="Search Snippets"
      searchBarAccessory={<SearchBarAccessory response={response} filter={filter} setFilter={setFilter} />}
    >
      {filteredFiles.map((file) => (
        <SnippetItem
          key={file.guid}
          response={response}
          snippet={file.snippet}
          file={file}
          isShowingDetail={isShowingDetail}
          setIsShowingDetail={setIsShowingDetail}
        />
      ))}
    </List>
  );
}
