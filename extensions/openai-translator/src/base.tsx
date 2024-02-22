import { List, ActionPanel, Action, LaunchProps, Icon } from "@raycast/api";
import { useState } from "react";
import { ContentView } from "./views/content";
import { useQuery } from "./hooks/useQuery";
import { LangDropdown } from "./views/lang-dropdown";
import { useHistory } from "./hooks/useHistory";
import capitalize from "capitalize";
import { TranslateMode } from "./providers/types";

export default function getBase(
  props: LaunchProps,
  initialMode: TranslateMode = "translate",
  forceEnableAutoStart = false,
  forceEnableAutoLoadSelected = false,
  forceEnableAutoLoadClipboard = false
) {
  let initialQuery: string | undefined = "";
  let ocrImage: string | undefined;
  if (props.launchContext) {
    initialMode = props.launchContext["mode"] as TranslateMode;
    initialQuery = props.launchContext["txt"];
    ocrImage = props.launchContext["img"];
    forceEnableAutoStart = true;
  } else {
    initialQuery = props.fallbackText;
  }

  const [mode, setMode] = useState<TranslateMode>(initialMode);
  const [selectedId, setSelectedId] = useState<string>("");
  const query = useQuery({
    initialQuery,
    forceEnableAutoStart,
    forceEnableAutoLoadSelected,
    forceEnableAutoLoadClipboard,
    ocrImage,
  });
  const history = useHistory();
  const [isInit, setIsInit] = useState<boolean>(true);
  const [isEmpty, setIsEmpty] = useState<boolean>(true);
  return (
    <List
      searchText={query.text}
      isShowingDetail={!isInit && !isEmpty}
      filtering={false}
      isLoading={isInit}
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
      <ContentView
        query={query}
        history={history}
        mode={mode}
        setMode={setMode}
        setSelectedId={setSelectedId}
        setIsInit={setIsInit}
        setIsEmpty={setIsEmpty}
      />
    </List>
  );
}
