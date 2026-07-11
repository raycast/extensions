import { List, getPreferenceValues, ActionPanel, Action, Icon } from "@raycast/api";
import { useState } from "react";
import { useSuggestions, useArticle } from "./api";
import { Preferences, Suggestion } from "./types";
import { ArticleDetail } from "./components/ArticleDetail";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const [selectedWord, setSelectedWord] = useState<{ word: string; dict: 1 | 2 | 3 } | null>(null);

  const preferences = getPreferenceValues<Preferences>();

  const { data: suggestionsResponse, isLoading: isLoadingSuggestions } = useSuggestions(searchText, preferences);
  const { data: articleData, isLoading: isLoadingArticle } = useArticle(
    selectedWord?.word ?? "",
    selectedWord?.dict ?? 3
  );

  const suggestions: Suggestion[] = Array.isArray(suggestionsResponse) ? suggestionsResponse : [];

  const filteredSuggestions = suggestions.filter((result) => {
    if (!result || typeof result.dict !== "number") return false;

    // dict: 1 = bokmål, 2 = nynorsk, 3 = both
    if (result.dict === 3) return preferences.includeBokmal || preferences.includeNynorsk;
    if (result.dict === 1) return preferences.includeBokmal;
    if (result.dict === 2) return preferences.includeNynorsk;

    return false;
  });

  return (
    <List
      searchBarPlaceholder="Search Norwegian dictionary..."
      onSearchTextChange={setSearchText}
      isLoading={isLoadingSuggestions}
      isShowingDetail={isShowingDetail}
      throttle
    >
      {filteredSuggestions.map((suggestion) => (
        <List.Item
          key={suggestion.id}
          title={suggestion.w}
          accessories={[{ text: suggestion.dict === 1 ? "Bokmål" : suggestion.dict === 2 ? "Nynorsk" : "Both" }]}
          detail={
            articleData && isShowingDetail ? (
              <ArticleDetail
                articles={articleData}
                isLoading={
                  isLoadingArticle &&
                  ((selectedWord?.dict === 1 && (!articleData.bm || articleData.bm.length === 0)) ||
                    (selectedWord?.dict === 2 && (!articleData.nn || articleData.nn.length === 0)) ||
                    (selectedWord?.dict === 3 &&
                      (!articleData.bm ||
                        articleData.bm.length === 0 ||
                        !articleData.nn ||
                        articleData.nn.length === 0)))
                }
              />
            ) : null
          }
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action
                  title="Show Details"
                  icon={Icon.Sidebar}
                  onAction={() => {
                    setSelectedWord({
                      word: suggestion.w,
                      dict: suggestion.dict,
                    });
                    setIsShowingDetail(true);
                  }}
                />
                <Action.OpenInBrowser
                  title="Open in Browser"
                  url={`https://ordbokene.no/nob/${
                    suggestion.dict === 1 ? "bm" : suggestion.dict === 2 ? "nn" : "bm,nn"
                  }/${encodeURIComponent(suggestion.w)}`}
                />
                <Action.CopyToClipboard title="Copy Word" content={suggestion.w} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
