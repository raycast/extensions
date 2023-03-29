import { Icon, List, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import getEngine, { EngineHookProps, EngineID } from "../engines";
import { SearchResultList, AutoCompleteList } from "../components/";
import { SearchContext, useEngine, useStatedCache } from "../hooks";
import { supportedEngine } from "../constants";
import ConfigView from "./ConfigView";

type SearchDropdownProps = {
  selectedEngine: EngineID | undefined;
  onChange: (value: EngineID) => void;
};

function SearchDropdown({ selectedEngine, onChange: onSuperChange }: SearchDropdownProps) {
  const navigation = useNavigation();
  // console.debug('reload SearchDropdown', selectedEngine)
  const onChange = (value: EngineID | "config") => {
    if (value === "config") {
      navigation.push(<ConfigView />);
    } else {
      onSuperChange(value);
    }
  };
  return (
    <List.Dropdown
      value={selectedEngine || ""}
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
}

const EntryList = ({ initQuery = "" }: { initQuery: string }) => {
  const [query, setQuery] = useState(initQuery);
  const [isShowingDetail, setShowingDetail] = useState(false);
  const [selectedEngine, setSelectedEngine] = useStatedCache<EngineID>("engine");
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
    // console.debug('onSelectionChange', id)
    // BUG: here would cause double render
    setShowingDetail(!!id?.startsWith("detail"));
  };
  // console.debug(`reload Command`, query, isShowingDetail)
  return (
    <List
      isShowingDetail={isShowingDetail}
      isLoading={isLoading}
      searchBarPlaceholder="Look up any words, language auto detected"
      onSearchTextChange={setQuery}
      onSelectionChange={onSelectionChange}
      searchText={query}
      searchBarAccessory={<SearchDropdown selectedEngine={selectedEngine} onChange={setSelectedEngine} />}
    >
      <AutoCompleteList query={query} setQuery={setQuery} />
      <SearchContext.Provider value={searchStatus}>
        <SearchResultList data={(!query.startsWith("-") && data) || undefined} setQuery={setQuery} />
      </SearchContext.Provider>
    </List>
  );
};
export default EntryList;
