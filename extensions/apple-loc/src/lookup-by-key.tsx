import { List } from "@raycast/api";
import { useCachedState, useExec } from "@raycast/utils";
import { useState } from "react";
import {
  buildArgs,
  cliErrorHandler,
  getCliPath,
  getDbPath,
  isFuzzyEnabled,
  parseCLIOutput,
  PlatformDropdown,
  ResultListItem,
  useHistory,
  useInfo,
} from "./shared";

export default function LookupByKey() {
  const [searchText, setSearchText] = useState("");
  const [platform, setPlatform] = useState("");
  const [langs, setLangs] = useCachedState<string[]>("langs", []);
  const { info, isLoading: infoLoading } = useInfo();
  const { history, addToHistory, removeFromHistory } = useHistory();
  const cliPath = getCliPath();
  const dbPath = getDbPath();

  const { data, isLoading } = useExec(
    cliPath,
    [
      "lookup",
      "--key",
      searchText,
      ...(isFuzzyEnabled() ? ["--fuzzy"] : []),
      ...buildArgs({ platform: platform || undefined, langs: langs.length ? langs : undefined, db: dbPath }),
    ],
    {
      execute: searchText.length > 0,
      keepPreviousData: true,
      parseOutput: ({ stdout }) => parseCLIOutput(stdout),
      onError: cliErrorHandler(cliPath, dbPath),
    },
  );

  return (
    <List
      isLoading={isLoading || infoLoading}
      isShowingDetail
      searchBarPlaceholder="Lookup by source key…"
      onSearchTextChange={setSearchText}
      throttle
      filtering={false}
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
