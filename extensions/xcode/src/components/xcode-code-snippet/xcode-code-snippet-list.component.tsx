import { useCachedPromise } from "@raycast/utils";
import { XcodeCodeSnippetService } from "../../services/xcode-code-snippet.service";
import { List } from "@raycast/api";
import { XcodeCodeSnippetListItem } from "./xcode-code-snippet-list-item.component";

/**
 * Xcode Code Snippet List
 */
export function XcodeCodeSnippetList() {
  const codeSnippets = useCachedPromise(XcodeCodeSnippetService.codeSnippets);
  return (
    <List isLoading={codeSnippets.isLoading} isShowingDetail={!!codeSnippets.data?.length}>
      {codeSnippets.data?.map((codeSnippet) => (
        <XcodeCodeSnippetListItem
          key={codeSnippet.IDECodeSnippetIdentifier}
          codeSnippet={codeSnippet}
          onSave={codeSnippets.revalidate}
          onDelete={codeSnippets.revalidate}
        />
      ))}
    </List>
  );
}
