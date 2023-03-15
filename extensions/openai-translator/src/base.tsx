import { List, Detail, ActionPanel, Action, getPreferenceValues, LaunchProps, Icon } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { ContentView } from "./views/content";
import { useQuery } from "./hooks/useQuery";
import { LangDropdown } from "./views/lang-dropdown";
import { useHistory } from "./hooks/useHistory";
import { TranslateMode } from "./providers/openai/translate";
import capitalize from "capitalize";

export default function getBase(
  props: LaunchProps,
  initialMode: TranslateMode = "translate",
  forceEnableAutoStart = false,
  forceEnableAutoLoadSelected = false,
  forceEnableAutoLoadClipboard = false
) {
  const [mode, setMode] = useState<TranslateMode>(initialMode);
  const [selectedId, setSelectedId] = useState<string>("");
  const query = useQuery({
    initialQuery: props.fallbackText,
    forceEnableAutoStart,
    forceEnableAutoLoadSelected,
    forceEnableAutoLoadClipboard,
  });
  const history = useHistory();

  return (
    <List
      searchText={query.text}
      isShowingDetail={history.data.length > 0 || query.querying ? true : false}
      filtering={false}
      isLoading={query.isLoading}
      selectedItemId={selectedId}
      searchBarPlaceholder={`${capitalize(mode)}...`}
      onSearchTextChange={query.updateText}
      searchBarAccessory={
        <LangDropdown
          type={query.langType}
          selectedStandardLang={query.langType == "To" ? query.to : query.from}
          onLangChange={query.langType == "To" ? query.updateTo : query.updateFrom}
        />
      }
      throttle={false}
      navigationTitle={capitalize(mode)}
      actions={
        <ActionPanel>
          {query.text && (
            <Action title={capitalize(mode)} icon={Icon.Book} onAction={() => query.updateQuerying(true)} />
          )}
          <Action
            title={`Switch to Translate ${query.langType == "To" ? "From" : "To"}`}
            onAction={() => {
              query.updateLangType(query.langType == "To" ? "From" : "To");
            }}
          />
        </ActionPanel>
      }
    >
      <ContentView query={query} history={history} mode={mode} setMode={setMode} setSelectedId={setSelectedId} />
    </List>
  );
}
