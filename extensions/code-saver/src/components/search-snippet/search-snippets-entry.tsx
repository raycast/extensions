import { Icon, List } from "@raycast/api";
import { useState, useMemo } from "react";
import { useDataFetch, fetchSnippets } from "../../lib/hooks/use-data-ops";
import { Snippet, Library, Label } from "../../lib/types/dto";
import { SNIPPETS_FILTER } from "../../lib/types/snippet-filters";
import InitError from "../init/init-error";
import { ItemActions } from "./item-actions";
import { ItemDetail } from "./item-detail";
import { SearchBarAccessory } from "./search-bar-accessory";

function SnippetItem({ snippet, onUpdateSuccess }: { snippet: Snippet; onUpdateSuccess: () => void }) {
  return (
    <List.Item
      title={snippet.title}
      actions={<ItemActions snippet={snippet} onUpdateSuccess={onUpdateSuccess} />}
      accessories={
        snippet.formatType == "tldr"
          ? [{ icon: Icon.BulletPoints, tooltip: "View detail to copy one entry of code" }]
          : []
      }
      detail={<ItemDetail snippet={snippet} />}
    />
  );
}

export default function SearchSnippetsEntry() {
  const { isLoading: isLibLoading, data: libraries, error: loadLibErr } = useDataFetch<Library>("library");
  const { isLoading: isLabelLoading, data: labels, error: loadLabelErr } = useDataFetch<Label>("label");
  const { isLoading: isSnippetLoading, data: snippets, error: loadSnippetErr, revalidate } = fetchSnippets();

  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<SNIPPETS_FILTER>("all");
  const isLoading = isLabelLoading || isLibLoading || isSnippetLoading;
  const errMsg = (function (err) {
    if (loadLabelErr !== undefined) {
      return `# Something wrong
Some errors happened when fetching labels, libraries or snippets from database. 
Error details are as follows:
\`\`\`
${err instanceof Error ? err.stack : String(err)}
\`\`\`
`;
    }
    return null;
  })(loadLabelErr || loadLibErr || loadSnippetErr);

  const trimmedSearchQuery = searchQuery.trim().toLocaleLowerCase();
  const filteredSnippets = useMemo(() => {
    return snippets
      ?.filter((snippet) => {
        if (trimmedSearchQuery.length === 0) {
          return true;
        }
        return (
          snippet.title.toLocaleLowerCase().includes(trimmedSearchQuery) ||
          snippet.content.toLocaleLowerCase().includes(trimmedSearchQuery) ||
          snippet.fileName.toLocaleLowerCase().includes(trimmedSearchQuery)
        );
      })
      .filter((snippet) => {
        if (filter.includes("library_")) {
          const uuid = filter.replace("library_", "");
          return snippet.library.uuid === uuid;
        } else if (filter.includes("label_")) {
          const uuid = filter.replace("label_", "");
          return snippet.labels.find((l) => l.uuid == uuid) != undefined;
        } else {
          return true;
        }
      });
  }, [snippets, trimmedSearchQuery, filter]);

  return errMsg ? (
    <InitError errMarkdown={errMsg} />
  ) : (
    <List
      searchText={searchQuery}
      onSearchTextChange={setSearchQuery}
      isShowingDetail={true}
      isLoading={isLoading}
      searchBarPlaceholder="Search Snippets"
      searchBarAccessory={
        <SearchBarAccessory
          labels={labels ? labels : []}
          libraries={libraries ? libraries : []}
          filter={filter}
          setFilter={setFilter}
        />
      }
    >
      {(filteredSnippets ? filteredSnippets : []).map((snippet) => (
        <SnippetItem key={snippet.uuid} snippet={snippet} onUpdateSuccess={() => revalidate()} />
      ))}
    </List>
  );
}
