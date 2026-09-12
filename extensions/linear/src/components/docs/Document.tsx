import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { format } from "date-fns";

import { getDocumentIcon } from "../../helpers/documents";
import { getInitiativeIcon } from "../../helpers/initiatives";
import { getProjectIcon } from "../../helpers/projects";
import { getUserIcon } from "../../helpers/users";

import { DocumentActions, DocumentActionsProps } from "./DocumentActions";
import { DocumentDetail } from "./DocumentDetail";

export function Document({ doc, ...rest }: DocumentActionsProps) {
  const keywords = [doc.project?.name ?? "", doc.initiative?.name ?? "", doc.title, doc.creator.displayName];
  const lastUpdated = doc.updatedAt ? new Date(doc.updatedAt) : new Date(doc.createdAt);

  return (
    <List.Item
      key={doc.id}
      title={doc.title}
      keywords={keywords}
      icon={getDocumentIcon(doc)}
      accessories={[
        ...(doc.project
          ? [
              {
                tag: {
                  value: doc.project.name,
                  color: doc.project.color
                    ? { light: doc.project.color, dark: doc.project.color, adjustContrast: true }
                    : Color.SecondaryText,
                },
                icon: getProjectIcon(doc.project),
              },
            ]
          : []),
        ...(doc.initiative
          ? [
              {
                tag: {
                  value: doc.initiative.name,
                  color: doc.initiative.color
                    ? { light: doc.initiative.color, dark: doc.initiative.color, adjustContrast: true }
                    : Color.SecondaryText,
                },
                icon: getInitiativeIcon(doc.initiative),
              },
            ]
          : []),
        {
          date: lastUpdated,
          icon: Icon.Clock,
          tooltip: `Updated: ${format(lastUpdated, "MM/dd/yyyy")}`,
        },
        {
          icon: getUserIcon(doc.creator),
          tooltip: `Creator: ${doc.creator.displayName} (${doc.creator.email})`,
        },
      ]}
      actions={
        <ActionPanel>
          <Action.Push title="Show Content" target={<DocumentDetail doc={doc} {...rest} />} icon={Icon.Eye} />

          <DocumentActions doc={doc} {...rest} />
        </ActionPanel>
      }
    />
  );
}
