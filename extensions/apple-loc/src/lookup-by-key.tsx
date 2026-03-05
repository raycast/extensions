import { List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useState } from "react";
import { isFuzzyEnabled, PlatformDropdown, ResultListItem, useHistory, useInfo, usePaginatedCLI } from "./shared";

export default function LookupByKey() {
  const [searchText, setSearchText] = useState("");
  const [platform, setPlatform] = useState("");
  const [langs, setLangs] = useCachedState<string[]>("langs", []);
  const { info, isLoading: infoLoading } = useInfo();
  const { history, addToHistory, removeFromHistory } = useHistory();

  const { data, isLoading, pagination } = usePaginatedCLI({
    command: ["lookup", "--key", searchText, ...(isFuzzyEnabled() ? ["--fuzzy"] : [])],
    platform: platform || undefined,
    langs: langs.length ? langs : undefined,
    execute: searchText.length > 0,
  });

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Lookup by source key…"
      onSearchTextChange={setSearchText}
      throttle
      filtering={false}
      pagination={pagination}
      navigationTitle={langs.length > 0 ? `Language: ${langs.join(", ")}` : undefined}
      searchBarAccessory={<PlatformDropdown info={info} isLoading={infoLoading} onChange={setPlatform} />}
    >
      {searchText.length > 0
        ? (data ?? []).map((result, index) => (
            <ResultListItem
              key={`${result.source}-${result.bundle_name}-${index}`}
              result={result}
              platform={platform}
              langs={langs}
              languages={info?.languages ?? []}
              onLangToggle={(l) => setLangs((prev) => (prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]))}
              onLangClear={() => setLangs([])}
              onAction={addToHistory}
            />
          ))
        : history.length > 0 && (
            <List.Section title="Recent">
              {history.map((entry) => (
                <ResultListItem
                  key={entry.id}
                  result={entry.result}
                  platform={platform}
                  langs={langs}
                  languages={info?.languages ?? []}
                  onLangToggle={(l) =>
                    setLangs((prev) => (prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]))
                  }
                  onLangClear={() => setLangs([])}
                  onAction={addToHistory}
                  onRemoveFromHistory={removeFromHistory}
                />
              ))}
            </List.Section>
          )}
    </List>
  );
}
