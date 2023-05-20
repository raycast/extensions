import { List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { ActionListSection } from "./components/ActionListSection";
import { URL, URLSearchParams } from "url";
import { contents } from "./util/clipboard";

export default function Command() {
  const [inputText, setInputText] = useState("");

  useEffect(() => {
    async function getClipboard() {
      try {
        const clipboard = await contents();
        new URL(clipboard);
        setInputText(clipboard);
      } catch (e) {
        // if not a valid URL, do nothing
      }
    }
    getClipboard();
  }, []);

  let url,
    protocol,
    host,
    path,
    port,
    query,
    fragment,
    queryJson = "";
  try {
    url = new URL(inputText);
    protocol = url.protocol;
    host = url.hostname;
    path = url.pathname;
    port = url.port;
    query = url.search;
    fragment = url.hash;

    const searchParams = new URLSearchParams(url.search);
    const queryParams: { [key: string]: string } = {};
    for (const pair of searchParams.entries()) {
      queryParams[pair[0]] = pair[1];
    }
    queryJson = JSON.stringify(queryParams);
  } catch (e) {
    if (inputText != "") {
      showToast(Toast.Style.Failure, "Invalid URL");
    }
  }

  return (
    <List searchText={inputText} onSearchTextChange={setInputText} searchBarPlaceholder="Input URL">
      {protocol && <ActionListSection title="Protocol" text={protocol} />}
      {host && <ActionListSection title="Host" text={host} />}
      {path && <ActionListSection title="Path" text={path} />}
      {port && <ActionListSection title="Port" text={port} />}
      {query && <ActionListSection title="Query" text={query} />}
      {queryJson && <ActionListSection title="queryParams" text={queryJson} needFormat={true} />}
      {fragment && <ActionListSection title="Fragment" text={fragment} />}
    </List>
  );
}
