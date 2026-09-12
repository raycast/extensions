import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { DocumentDetailView } from "./document-detail";
import { docTitle, documentUrl, listSubtitle, typeLabel } from "../lib/format";
import type { DocumentListItem as Doc, SearchResultItem } from "../lib/types";

// One vault document as a List.Item, shared by Search Vault and Browse
// Documents. When `detailMarkdown` is provided (search), the row renders an
// inline Detail pane with a snippet + entity tags.
export function DocumentListItem({
  doc,
  showingDetail,
  onToggleDetail,
}: {
  doc: Doc | SearchResultItem;
  showingDetail?: boolean;
  onToggleDetail?: () => void;
}) {
  const search = "snippet" in doc ? (doc as SearchResultItem) : undefined;

  return (
    <List.Item
      title={docTitle(doc)}
      subtitle={showingDetail ? undefined : listSubtitle(doc)}
      accessories={showingDetail ? undefined : doc.vault ? [{ tag: doc.vault.name }] : undefined}
      detail={search ? <SearchDetail item={search} /> : undefined}
      actions={
        <ActionPanel>
          <Action.Push
            title="Show Details"
            icon={Icon.Sidebar}
            target={<DocumentDetailView id={doc.id} knownTitle={docTitle(doc)} />}
          />
          <Action.OpenInBrowser title="Open in Granite" url={documentUrl(doc.id)} />
          {onToggleDetail ? (
            <Action
              title={showingDetail ? "Hide Preview" : "Show Preview"}
              icon={Icon.AppWindowSidebarLeft}
              shortcut={{ modifiers: ["cmd"], key: "p" }}
              onAction={onToggleDetail}
            />
          ) : null}
          <Action.CopyToClipboard
            title="Copy Title"
            content={docTitle(doc)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
          />
          <Action.CopyToClipboard title="Copy Document ID" content={doc.id} />
        </ActionPanel>
      }
    />
  );
}

function SearchDetail({ item }: { item: SearchResultItem }) {
  const type = typeLabel(item);
  return (
    <List.Item.Detail
      markdown={item.snippet?.trim() || "_No preview text._"}
      metadata={
        <List.Item.Detail.Metadata>
          {type ? <List.Item.Detail.Metadata.Label title="Type" text={type} /> : null}
          {item.primary_date ? (
            <List.Item.Detail.Metadata.Label title="Date" text={item.primary_date.slice(0, 10)} />
          ) : null}
          {item.tax_year ? <List.Item.Detail.Metadata.Label title="Tax year" text={String(item.tax_year)} /> : null}
          {item.vault ? <List.Item.Detail.Metadata.Label title="Vault" text={item.vault.name} /> : null}
          {item.entities.length ? (
            <List.Item.Detail.Metadata.TagList title="Entities">
              {item.entities.map((e) => (
                <List.Item.Detail.Metadata.TagList.Item key={e.id} text={e.display_name} />
              ))}
            </List.Item.Detail.Metadata.TagList>
          ) : null}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
