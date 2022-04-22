import useAppExists from "./hooks/useAppExists";
import useConfig from "./hooks/useConfig";
import useDB from "./hooks/useDB";
import {useState} from "react";
import {Action, ActionPanel, List} from "@raycast/api";
import useDocumentSearch from "./hooks/useDocumentSearch";

// noinspection JSUnusedGlobalSymbols
export default function docsearch() {
  const appExists = useAppExists();
  const config = useConfig(appExists);
  const db = useDB(config);

  const [query, setQuery] = useState("");
  const {resultsLoading, results} = useDocumentSearch(db, query);


  return <List isLoading={resultsLoading} isShowingDetail={true} onSearchTextChange={setQuery}>
    {results.map(doc => <List.Item
      key={doc.block.id}
      title={doc.block.content}
      detail={<List.Item.Detail markdown={doc.blocks.map(block => block.content).join('\n\n---\n\n')} />}
      actions={
      <ActionPanel>
        <Action.OpenInBrowser url={`craftdocs://open?blockId=${doc.block.id}&spaceId=${doc.block.spaceID}`} />
      </ActionPanel>
      }
    />)}
    <List.Item title="title" detail={<List.Item.Detail markdown={"hello there"} />} />
  </List>
}