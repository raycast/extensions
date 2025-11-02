/**
 * Search App - Main Command
 * AI-powered application search for Raycast
 */

import { useState, useEffect } from "react";
import { List, Icon } from "@raycast/api";
import { useAppSearch } from "./hooks/useAppSearch";
import { InstalledAppListItem } from "./components/InstalledAppListItem";
import { AskAIListItem } from "./components/AskAIListItem";
import { SuggestionListItem } from "./components/SuggestionListItem";
import { useTranslations } from "./lib/i18n";

export default function SearchAppCommand() {
  const [searchText, setSearchText] = useState("");
  const [forceAI, setForceAI] = useState(false);
  const t = useTranslations();

  const { results, isLoading, showAskAI } = useAppSearch({ searchText, forceAI });

  // Reset forceAI when search text changes
  useEffect(() => {
    setForceAI(false);
  }, [searchText]);

  const hasNoResults = results.installed.length === 0 && results.suggestions.length === 0;
  const showEmptyView = hasNoResults && searchText && !isLoading && !showAskAI;

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={t.searchBarPlaceholder}
      throttle
    >
      {showEmptyView ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={t.emptyViewTitle}
          description={t.emptyViewDescription(searchText)}
        />
      ) : (
        <>
          {/* Installed Applications Section */}
          {results.installed.length > 0 && (
            <List.Section
              title={t.installedSectionTitle(results.installed.length)}
              subtitle={t.installedSectionSubtitle}
            >
              {results.installed.map((result) => (
                <InstalledAppListItem key={result.app.bundleId || result.app.path} result={result} />
              ))}
            </List.Section>
          )}

          {/* Ask AI Option for Short Queries */}
          {showAskAI && (
            <List.Section title={t.askAISectionTitle}>
              <AskAIListItem onTriggerAI={() => setForceAI(true)} />
            </List.Section>
          )}

          {/* Suggestions Section */}
          {results.suggestions.length > 0 && (
            <List.Section
              title={t.suggestionsSectionTitle(results.suggestions.length)}
              subtitle={t.suggestionsSectionSubtitle}
            >
              {results.suggestions.map((suggestion, index) => (
                <SuggestionListItem key={`${suggestion.name}-${index}`} suggestion={suggestion} index={index} />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
