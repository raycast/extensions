import { Action, ActionPanel, Detail } from "@raycast/api";
import { useDocumentContent } from "../../hooks/useDocuments";
import { DocumentActions, DocumentActionsProps } from "./DocumentActions";
import { emojify } from "node-emoji";

export function DocumentDetail({ doc, ...rest }: DocumentActionsProps) {
  const { content, isLoadingContent } = useDocumentContent(doc.id);

  let markdown = `# ${doc.title}`;
  if (content) {
    markdown += `\n\n${emojify(content)}`;
  }

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoadingContent}
      navigationTitle={doc.title}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Markdown" content={markdown} />

          <DocumentActions doc={doc} {...rest} />
        </ActionPanel>
      }
    />
  );
}
