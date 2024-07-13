import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import { getUserIcon } from "../../helpers/users";
import { Doc } from "../../api/documents";
import { getDocumentIcon } from "../../helpers/documents";
import { format } from "date-fns";
import { getProjectIcon } from "../../helpers/projects";
import { DocumentActions } from "./DocumentActions";
import { DocumentDetail } from "./DocumentDetail";

type DocumentProps = {
  doc: Doc;
  mutateDocs: MutatePromise<{ docs: Doc[]; hasMoreDocs: boolean } | undefined>;
};

export function Document({ doc, mutateDocs }: DocumentProps) {
  const keywords = [doc.project.name, doc.title, doc.creator.displayName];
  const lastUpdated = doc.updatedAt ? new Date(doc.updatedAt) : new Date(doc.createdAt);

  return (
    <List.Item
      key={doc.id}
      title={doc.title}
      keywords={keywords}
      icon={getDocumentIcon(doc)}
      accessories={[
        ...(doc.archivedAt
          ? [
              {
                icon: { source: Icon.DeleteDocument, tintColor: Color.Orange },
                tooltip: `Deleted: ${format(new Date(doc.archivedAt), "MM/dd/yyyy")}`,
              },
            ]
          : []),
        {
          date: lastUpdated,
          icon: Icon.Clock,
          tooltip: `Updated: ${format(lastUpdated, "MM/dd/yyyy")}`,
        },
        {
          icon: getProjectIcon(doc.project),
          tooltip: `Project: ${doc.project.name}`,
        },
        {
          icon: getUserIcon(doc.creator),
          tooltip: `Creator: ${doc.creator.displayName} (${doc.creator.email})`,
        },
      ]}
      actions={
        <ActionPanel>
          {!doc.archivedAt && (
            <Action.Push
              title="Show Document"
              target={<DocumentDetail doc={doc} mutateDocs={mutateDocs} />}
              icon={Icon.Eye}
            />
          )}

          <DocumentActions doc={doc} mutateDocs={mutateDocs} />
        </ActionPanel>
      }
    />
  );
}
