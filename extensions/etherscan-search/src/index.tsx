import { ActionPanel, Action, List, Clipboard } from "@raycast/api";
import { useEffect, useState } from "react";
import tokens from "./tokenlist.json";

const matchSearch = (search: string, fromClipboard: boolean) => {
  let title = "";
  let path = "";

  /* 
    A transaction hash is either 64 (without 0x prefix) or 66 characters
    An address is either 40 (without 0x prefix) or 42 characters
    Check against the token list to see if we find one
    If there's .eth in the path, show the ENS search page
    If the search is all digits, show the block
   */
  if (search.length === 64 || search.length === 66) {
    if (search.length === 64 && !search.startsWith("0x")) {
      search = "0x" + search;
    }
    title = `Transaction ${search}.`;
    path = `tx/${search}`;
  } else if (search.length === 40 || search.length === 42) {
    if (search.length === 40 && !search.startsWith("0x")) {
      search = "0x" + search;
    }
    const foundToken = tokens.find(({ address }) => address == search);
    if (foundToken) {
      const { name, symbol, decimals } = foundToken;
      title = `${name} token (${symbol}) - ${decimals} decimals ${search}.`;
      path = `token/${foundToken}`;
    } else {
      title = `Address ${search}`;
      path = `address/${search}`;
    }
  } else if (search.includes(".eth")) {
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

export default function Command() {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");

  const handleSearchTextChange = (search: string, fromClipboard = false) => {
    const { title, path } = matchSearch(search, fromClipboard);
    setTitle(title);
    setUrl(`https://etherscan.io/${path}`);
  };
  // Grab the clipboard contents and run a search
  useEffect(() => {
    const getClipboard = async () => {
      const clipboard = (await Clipboard.readText()) || "";
      console.log(clipboard);
      handleSearchTextChange(clipboard, true);
    };
    getClipboard();
  }, []);

  return (
    <List
      searchBarPlaceholder="Search by Address / Txn Hash / Block / Token / Ens"
      onSearchTextChange={handleSearchTextChange}
    >
      {title !== "" && (
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
      )}
    </List>
  );
}
