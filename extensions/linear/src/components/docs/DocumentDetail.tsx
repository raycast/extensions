import { Action, ActionPanel, Detail } from "@raycast/api";
import { useDocumentContent } from "../../hooks/useDocuments";
import { DocumentActions, DocumentActionsProps } from "./DocumentActions";
import { emojify } from "node-emoji";

export function DocumentDetail({ doc: parent, ...rest }: DocumentActionsProps) {
  const { doc, isLoadingDoc, mutateDoc } = useDocumentContent(parent.id);

  let markdown = "";
  if (doc?.content) {
    markdown = `# ${doc.title}\n\n${emojify(doc.content)}`;
  }

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoadingDoc}
      navigationTitle={parent.title}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Markdown" content={markdown} />

          {doc && <DocumentActions doc={doc} mutateDoc={mutateDoc} {...rest} deleteUnsupported />}
        </ActionPanel>
      }
    />
  );
}
