import { ActionPanel, Action, List } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect } from "react";
import { searchTerms, GlossaryTerm } from "./data-store";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function search() {
      setIsLoading(true);
      try {
        const results = await searchTerms(searchText);
        setTerms(results);
      } catch (error) {
        showFailureToast(error, { title: "Failed to search terms" });
      } finally {
        setIsLoading(false);
      }
    }
    search();
  }, [searchText]);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search terms..."
      throttle
      isShowingDetail
    >
      {terms.map((term) => (
        <List.Item
          key={term.id}
          title={term.term}
          subtitle={
            term.definition.length > 100
              ? `${term.definition.substring(0, 100)}...`
              : term.definition
          }
          detail={
            <List.Item.Detail
              markdown={`# ${term.term}\n\n${term.definition}`}
            />
          }
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Definition"
                content={term.definition}
              />
              <Action.CopyToClipboard title="Copy Term" content={term.term} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
