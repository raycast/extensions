import { Icon, List, useNavigation } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useEffect, useState } from "react";
import getEngine, { EngineHookProps, EngineID } from "../engines";
import { SearchResultList, AutoCompleteList } from "../components/";
import { SearchContext, useEngine } from "../hooks";
import { supportedEngine, supportedLanguages } from "../constants";
import ConfigView from "./ConfigView";
import { LanguageCode } from "../types";

type SearchDropdownProps = {
  selectedEngine: EngineID | undefined;
  onChange: (value: EngineID) => void;
};

const SearchDropdown = ({ selectedEngine, onChange: onSuperChange }: SearchDropdownProps) => {
  const navigation = useNavigation();
  const onChange = (value: EngineID | "config") => {
    if (value === "config") {
      navigation.push(<ConfigView />);
    } else {
      onSuperChange(value);
    }
  };
  return (
    <List.Dropdown
      value={selectedEngine || "googl"}
      tooltip="Select an engine"
      onChange={onChange as (value: string) => void}
    >
      <List.Dropdown.Item icon={Icon.Cog} title="View Configuration..." value="config" />
      <List.Dropdown.Section title="Supported Engines">
        {Object.entries(supportedEngine).map((engine) => (
          <List.Dropdown.Item key={engine[0]} title={engine[1]} value={engine[0]} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
};

const EntryList = ({ initQuery = "" }: { initQuery: string }) => {
  const [query, setQuery] = useState(initQuery);
  const [isShowingDetail, setShowingDetail] = useState(false);
  const [selectedEngine, setSelectedEngine] = useCachedState<EngineID>("engine");
  const [selectedPrimeLang = "en"] = useCachedState<LanguageCode | undefined>("primary_language");
  const activeEngine = getEngine(selectedEngine) as EngineHookProps<object, object>;
  const { isLoading, data, curTTS } = useEngine(query.trim(), activeEngine);
  const searchStatus = {
    curTTS,
    isShowingDetail,
  };
  useEffect(() => {
    setQuery(initQuery);
  }, [initQuery]);

  const onSelectionChange = (id: string | null) => {
    // BUG: here would cause double render
    setShowingDetail(!!id?.startsWith("detail"));
  };
  const emptyViewProps: { title: string; description: string } = (activeEngine.getEmptyViewProps &&
    activeEngine.getEmptyViewProps(selectedPrimeLang, query)) || {
    title: query
      ? `Sorry, There are no results for: ${query} on ${activeEngine.title}.`
      : `Look up any word on ${activeEngine.title}.`,
    description: query
      ? `Try looking up other dictionaries by using the dropdown menu or typing command: '-set engine ...'.`
      : `The word(s) will be translated to ${supportedLanguages[selectedPrimeLang].title}.`,
  };
  return (
    <List
      isShowingDetail={isShowingDetail}
      isLoading={isLoading}
      searchBarPlaceholder="Look up any word, language auto detected"
      onSearchTextChange={setQuery}
      onSelectionChange={onSelectionChange}
      searchText={query}
      searchBarAccessory={<SearchDropdown selectedEngine={selectedEngine} onChange={setSelectedEngine} />}
    >
      <AutoCompleteList query={query} setQuery={setQuery} />
      <SearchContext.Provider value={searchStatus}>
        <SearchResultList data={(!query.startsWith("-") && data) || undefined} setQuery={setQuery} />
      </SearchContext.Provider>
      <List.EmptyView {...emptyViewProps} />
    </List>
  );
};
export default EntryList;
