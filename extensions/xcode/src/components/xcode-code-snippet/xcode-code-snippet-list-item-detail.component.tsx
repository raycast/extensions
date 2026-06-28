import { XcodeCodeSnippet } from "../../models/xcode-code-snippet/xcode-code-snippet.model";
import { List } from "@raycast/api";
import { XcodeCodeSnippetCompletionScopeName } from "../../shared/xcode-code-snippet-completion-scope-name";
import { XcodeCodeSnippetProgrammingLanguageName } from "../../shared/xcode-code-snippet-programming-language-name";

/**
 * Xcode Code Snippet List Item Detail
 */
export function XcodeCodeSnippetListItemDetail(props: { codeSnippet: XcodeCodeSnippet }) {
  return (
    <List.Item.Detail
      markdown={`\`\`\`\n${props.codeSnippet.IDECodeSnippetContents}\n\`\`\``}
      metadata={
        <List.Item.Detail.Metadata>
          {props.codeSnippet.IDECodeSnippetSummary ? (
            <List.Item.Detail.Metadata.Label title="Summary" text={props.codeSnippet.IDECodeSnippetSummary} />
          ) : undefined}
          <List.Item.Detail.Metadata.Label
            title="Language"
            text={XcodeCodeSnippetProgrammingLanguageName(props.codeSnippet.IDECodeSnippetLanguage)}
          />
          <List.Item.Detail.Metadata.Label title="Completion" text={props.codeSnippet.IDECodeSnippetCompletionPrefix} />
          <List.Item.Detail.Metadata.TagList title="Availability">
            {props.codeSnippet.IDECodeSnippetCompletionScopes.map((scope) => (
              <List.Item.Detail.Metadata.TagList.Item key={scope} text={XcodeCodeSnippetCompletionScopeName(scope)} />
            ))}
          </List.Item.Detail.Metadata.TagList>
        </List.Item.Detail.Metadata>
      }
    />
  );
}
