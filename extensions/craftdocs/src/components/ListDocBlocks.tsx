import {Action, ActionPanel, List} from "@raycast/api";
import { DocBlock } from "../hooks/useDocumentSearch";
import CreateDocumentItem from "./CreateDocumentItem";
import Config from "../Config";

type ListDocBlocksParams = {
  resultsLoading: boolean;
  setQuery: (query: string) => void;
  results: DocBlock[];
  query: string;
  config: Config | null;
};

export default function ListDocBlocks({resultsLoading, results, setQuery, query, config}: ListDocBlocksParams) {
  return <List isLoading={resultsLoading} isShowingDetail={true} onSearchTextChange={setQuery}>
    {results.map(doc => <List.Item
      key={doc.block.id}
      title={doc.block.content}
      detail={<List.Item.Detail markdown={doc.blocks.map(block => block.content).reverse().join('\n\n')} />}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={`craftdocs://open?blockId=${doc.block.id}&spaceId=${doc.block.spaceID}`} />
        </ActionPanel>
      }
    />)}
    {results.length === 0 && <CreateDocumentItem query={query} spaceID={config?.primarySpace()?.spaceID || ''} />}
  </List>
}