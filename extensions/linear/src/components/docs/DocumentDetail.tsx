import { Doc } from "../../api/documents";
import { ActionPanel, Detail } from "@raycast/api";
import { useDocumentContent } from "../../hooks/useDocuments";
import { DocumentActions } from "./DocumentActions";
import { MutatePromise } from "@raycast/utils";
import { emojify } from "node-emoji";

type DocumentDetailProps = {
  doc: Doc;
  mutateDocs: MutatePromise<{ docs: Doc[]; hasMoreDocs: boolean } | undefined>;
};

export function DocumentDetail({ doc, mutateDocs }: DocumentDetailProps) {
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
          <DocumentActions doc={doc} mutateDocs={mutateDocs} />
        </ActionPanel>
      }
    />
  );
}
