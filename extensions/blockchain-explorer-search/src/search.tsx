import { ActionPanel, Action, List, LocalStorage, Clipboard } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { defaultExplorer, explorers } from "./explorers";
import { Explorer } from "./interfaces";
import { AddressMatch, BlockMatch, ENSMatch, TokenMatch, TransactionMatch } from "./matchers";
import { tokenLists } from "./tokens";

const matchSearch = (search: string, explorer: Explorer) => {
  const Matchers = [
    new TokenMatch(search, explorer, tokenLists),
    new TransactionMatch(search, explorer),
    new BlockMatch(search, explorer),
    new AddressMatch(search, explorer),
    new ENSMatch(search, explorer),
  ];
  const matchedMatchers = Matchers.filter((Matcher) => Matcher.match());
  return matchedMatchers;
};

export default function Command() {
  const [selectedExplorer, setSelectedExplorer] = useState(defaultExplorer);
  const [search, setSearch] = useState("");
  const [clipboard, setClipboard] = useState("");
  const handleSearchTextChange = (search: string) => {
    setSearch(search);
  };

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
          console.log(error);
        }
      }
    };
    setFromStorage();
  }, []);

  const filteredMatches = useMemo(() => {
    return matchSearch(search, selectedExplorer);
  }, [search, selectedExplorer]);

  const filteredItems = filteredMatches.map((match) => (
    <List.Item
      key={match.title}
      title={match.title}
      accessories={clipboard === search ? [{ text: "From clipboard", icon: "📋" }] : []}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open link in Browser" url={match.path} />
          <Action.CopyToClipboard title="Copy link to Clipboard" content={match.path} />
          <Action.Paste title="Paste to Top Window" content={match.path} />
        </ActionPanel>
      }
    />
  ));

  return (
    <List
      searchBarPlaceholder="Search by Address / Transaction Hash / Block / Token"
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
          description={`Type an Address, Transaction hash,${
            selectedExplorer.chainId === 1 ? " ENS name," : ""
          } or block number to get started.`}
          title={`Searching on the ${selectedExplorer.chainName} network.`}
        />
      )}
    </List>
  );
}
