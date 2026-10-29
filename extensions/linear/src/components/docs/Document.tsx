import { Action, ActionPanel, Color, getPreferenceValues, Icon, List } from "@raycast/api";
import { format } from "date-fns";

import { getDocumentCreatorTooltip, getDocumentKeywords } from "../../helpers/documentCreator";
import { getDocumentIcon } from "../../helpers/documents";
import { getInitiativeIcon } from "../../helpers/initiatives";
import { getProjectIcon } from "../../helpers/projects";
import { getUserIcon } from "../../helpers/users";
import OpenInLinear from "../OpenInLinear";

import { DocumentActions, DocumentActionsProps } from "./DocumentActions";
import { DocumentDetail } from "./DocumentDetail";

export function Document({ doc, ...rest }: DocumentActionsProps) {
  const { primaryAction } = getPreferenceValues<Preferences>();
  const openInLinearFirst = primaryAction === "openInLinear";
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
          tooltip: getDocumentCreatorTooltip(doc.creator),
        },
      ]}
      actions={
        <ActionPanel>
          {openInLinearFirst ? <OpenInLinear title="Open Document" url={doc.url} /> : null}

          <Action.Push title="Show Content" target={<DocumentDetail doc={doc} {...rest} />} icon={Icon.Eye} />

          <DocumentActions doc={doc} hideOpenInLinear={openInLinearFirst} {...rest} />
        </ActionPanel>
      }
    />
  );
}
