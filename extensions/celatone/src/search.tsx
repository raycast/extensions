import { ActionPanel, Action, List, LocalStorage, Clipboard, Icon } from "@raycast/api";
import { useEffect, useState, useCallback, useMemo } from "react";
import debounce from "lodash.debounce";
import { defaultExplorer, explorers } from "./explorers";
import { Explorer } from "./interfaces";
import axios from "axios";

interface MatchItem {
  title: string;
  type: string;
  path: string;
  explorer: Explorer;
}
const matchSearch = async (search: string, explorer: Explorer) => {
  search = /^[a-z0-9]+$/i.test(search) ? search : "";
  if (search.length === 0) {
    return [];
  }

  const apiUrl = new URL(
    `https://celatone-api-feat-add-search-and-supported-netwo-h3giweexeq-as.a.run.app/v1/search/${search}`,
  );
  apiUrl.searchParams.append("networks", explorer.networkName);

  try {
    const response = await axios.get(apiUrl.toString());
    const data = response.data;
    if (data.length === 0) {
      return [];
    }
    const matches = data[explorer.networkName];
    if (!matches) {
      return [];
    }

    return Object.entries(matches).reduce<MatchItem[]>((acc, [key, value]) => {
      if (value) {
        if (key === "transactions") {
          key = "txs";
        }
        acc.push({
          title: `${key.charAt(0).toUpperCase() + key.slice(1)}: ${search}`,
          path: `${explorer.baseUrl}/${key}/${search}`,
          type: key,
          explorer,
        });
      }
      return acc;
    }, []);
  } catch (error) {
    console.error("Error fetching matches:", error);
    return [];
  }
};

export default function Command() {
  const [selectedExplorer, setSelectedExplorer] = useState(defaultExplorer);
  const [search, setSearch] = useState("");
  const [clipboard, setClipboard] = useState("");
  const [loaded, setLoaded] = useState({ clipboard: false, explorer: false });
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const handleSearchTextChange = useCallback(
    debounce((search: string) => {
      setSearch(search);
    }, 500),
    [],
  );

  const handleDropdownChange = async (selectedChainName: string) => {
    const foundExplorer = explorers.find(({ chainName }) => chainName === selectedChainName) || defaultExplorer;
    setSelectedExplorer(foundExplorer);
    await LocalStorage.setItem("selected-explorer", JSON.stringify(foundExplorer));
  };

  // Grab the clipboard contents and run a search
  useEffect(() => {
    const getClipboard = async () => {
      const clipboard = (await Clipboard.readText()) || "";
      setClipboard(clipboard);
      handleSearchTextChange(clipboard);
      setLoaded((prev) => ({ ...prev, clipboard: true }));
    };
    getClipboard();
  }, [selectedExplorer]);

  // Get the network from localStorage
  useEffect(() => {
    const setFromStorage = async () => {
      const selectedExplorerFromStorage = await LocalStorage.getItem<string>("selected-explorer");
      if (selectedExplorerFromStorage) {
        try {
          const parsedExplorer: Explorer = JSON.parse(selectedExplorerFromStorage);
          setSelectedExplorer(parsedExplorer);
        } catch (error) {
          setSelectedExplorer(defaultExplorer);
        }
      }
      setLoaded((prev) => ({ ...prev, explorer: true }));
    };
    setFromStorage();
  }, []);

  useEffect(() => {
    const fetchMatches = async () => {
      const fetchedMatches = await matchSearch(search, selectedExplorer);
      setMatches(fetchedMatches || []);
    };
    fetchMatches();
  }, [search, selectedExplorer]);

  const filteredItems = useMemo(
    () =>
      matches.map((match) => (
        <List.Item
          key={match.title}
          title={match.title}
          accessories={clipboard === search ? [{ text: "From clipboard", icon: Icon.Clipboard }] : []}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={match.path} />
              {match.type === "contracts" && (
                <Action.OpenInBrowser
                  url={`${match.explorer.baseUrl}/query?contract=${search}`}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "q" }}
                  title="Query"
                />
              )}
              {match.type === "contracts" && (
                <Action.OpenInBrowser
                  url={`${match.explorer.baseUrl}/execute?contract=${search}`}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                  title="Execute"
                />
              )}
              <Action.CreateQuicklink
                quicklink={{ link: match.path, name: `${match.explorer.chainName}: ${match.title} — ` }}
              />
              <Action.CopyToClipboard
                shortcut={{ modifiers: ["cmd"], key: "c" }}
                content={`${match.path}/query?contract=${match.path}`}
              />
              <Action.Paste shortcut={{ modifiers: ["cmd"], key: "v" }} content={match.path} />
            </ActionPanel>
          }
        />
      )),
    [matches, clipboard, search],
  );

  return (
    <List
      isLoading={!loaded.clipboard || !loaded.explorer}
      searchBarPlaceholder="Search by Address, Transaction, Block, and more."
      onSearchTextChange={handleSearchTextChange}
      searchBarAccessory={
        <List.Dropdown
          onChange={handleDropdownChange}
          value={selectedExplorer.chainName}
          tooltip="Currently selected network."
        >
          {explorers.map((explorer) => (
            <List.Dropdown.Item key={explorer.chainName} title={explorer.chainName} value={explorer.chainName} />
          ))}
        </List.Dropdown>
      }
    >
      {filteredItems.length ? (
        filteredItems
      ) : (
        <List.EmptyView
          icon={{ source: selectedExplorer.iconUri }}
          description={`Type an Address, Transaction hash`}
          title={`Searching on the ${selectedExplorer.chainName} network.`}
        />
      )}
    </List>
  );
}
