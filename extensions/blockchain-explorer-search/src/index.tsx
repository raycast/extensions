import { ActionPanel, Action, List, LocalStorage, Clipboard, useNavigation } from "@raycast/api";
import React, { useEffect, useState } from "react";
import { defaultExplorer, Explorer, explorers, tokenLists } from "./constants";

const matchSearch = (search: string, fromClipboard: boolean, explorer: Explorer) => {
  let title = "";
  let path = "";

  /* 
    A transaction hash is either 64 (without 0x prefix) or 66 characters
    An address is either 40 (without 0x prefix) or 42 characters
    Check against the token list to see if we find one
    If there's .eth in the path, show the ENS search page
    If the search is all digits, show the block
   */
  if ((search.length === 64 || search.length === 66) && /^[0-9A-Za-z]+$/.test(search)) {
    if (search.length === 64 && !search.startsWith("0x")) {
      search = "0x" + search;
    }
    title = `Transaction ${search}.`;
    path = `tx/${search}`;
  } else if ((search.length === 40 || search.length === 42) && /^[0-9A-Za-z]+$/.test(search)) {
    if (search.length === 40 && !search.startsWith("0x")) {
      search = "0x" + search;
    }
    const tokensToSearch = tokenLists[explorer.chainId] || [];
    const foundToken = tokensToSearch.length && tokensToSearch.find(({ address }) => address == search);
    if (foundToken) {
      const { name, symbol, decimals } = foundToken;
      title = `${name} token (${symbol}) - ${decimals} decimals ${search}.`;
      path = `token/${search}`;
    } else {
      title = `Address ${search}`;
      path = `address/${search}`;
    }
  } else if (explorer.chainId === 1 && search.includes(".eth")) {
    title = `ENS name ${search}.`;
    path = `enslookup-search?search=${search}`;
  } else if (/^\d+$/g.test(search)) {
    title = `Block height ${search}`;
    path = `block/${search}`;
  } else {
    path = "";
  }
  if (title !== "") {
    const titlePrefix = fromClipboard ? "📋 From Clipboard — " : "";
    title = titlePrefix + title;
  }
  return { title, path };
};

const ExplorerList = function ({ onChange }: { onChange: (explorer: Explorer) => void }) {
  const { pop } = useNavigation();

  const handleExplorerChange = async (explorer: Explorer) => {
    await LocalStorage.setItem("selected-explorer", JSON.stringify(explorer));
    onChange(explorer);
    pop();
  };
  return (
    <List>
      {explorers.map((explorer) => (
        <List.Item
          key={explorer.title}
          title={explorer.title}
          actions={
            <ActionPanel>
              <Action title={"Change Explorer"} onAction={() => handleExplorerChange(explorer)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};

export default function Command() {
  const [selectedExplorer, setSelectedExplorer] = useState(defaultExplorer);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");

  const handleSearchTextChange = (search: string, fromClipboard = false) => {
    const { title, path } = matchSearch(search, fromClipboard, selectedExplorer);
    setTitle(title);
    setUrl(`https://${selectedExplorer.baseUrl}/${path}`);
  };
  // Grab the clipboard contents and run a search
  useEffect(() => {
    const getClipboard = async () => {
      const clipboard = (await Clipboard.readText()) || "";
      handleSearchTextChange(clipboard, true);
    };
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
    getClipboard();
  }, []);

  const staticItems = [
    <React.Fragment key="static items">
      <List.Item
        title="Change Explorer"
        key="change"
        actions={
          <ActionPanel>
            <Action.Push title="Change Explorer" target={<ExplorerList onChange={setSelectedExplorer} />} />
          </ActionPanel>
        }
      />
      <List.Item
        title="Explorer Dashboard"
        key="dashboard"
        actions={
          <ActionPanel>
            <Action.OpenInBrowser url={`https://${selectedExplorer.baseUrl}`} />
            <Action.CopyToClipboard content={`https://${selectedExplorer.baseUrl}`} />
            <Action.Paste content={`https://${selectedExplorer.baseUrl}`} />
          </ActionPanel>
        }
      />
    </React.Fragment>,
  ];

  return (
    <List
      searchBarPlaceholder="Search by Address / Txn Hash / Block / Token"
      onSearchTextChange={handleSearchTextChange}
    >
      <List.Section title={`Searching on ${selectedExplorer.title}`}>
        {title !== "" && url !== "" ? (
          <>
            <List.Item
              key={url}
              title={title}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser title="Open link in Browser" url={url} />
                  <Action.CopyToClipboard title="Copy link to Clipboard" content={url} />
                  <Action.Paste title="Paste to Top Window" content={url} />
                </ActionPanel>
              }
            />
            {staticItems}
          </>
        ) : (
          <>{staticItems}</>
        )}
      </List.Section>
    </List>
  );
}
