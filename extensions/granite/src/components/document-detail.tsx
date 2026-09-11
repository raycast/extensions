import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { getClient } from "../lib/preferences";
import { docTitle, documentToMarkdown, documentUrl, typeLabel } from "../lib/format";
import type { DocumentDetail } from "../lib/types";

// Full document view, pushed from a search/browse list row. Fetches the
// structured fields; full text is opt-in (a toggle) to keep the payload small.
export function DocumentDetailView({ id, knownTitle }: { id: string; knownTitle?: string }) {
  const [withFullText, setWithFullText] = useState(false);

  const { isLoading, data: doc } = usePromise(
    (docId: string, full: boolean) =>
      getClient().request<DocumentDetail>("GET", `/documents/${encodeURIComponent(docId)}`, {
        query: full ? { include: "full_text" } : {},
      }),
    [id, withFullText],
  );

  const markdown = doc ? documentToMarkdown(doc) : knownTitle ? `# ${knownTitle}` : "";

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={doc ? docTitle(doc) : knownTitle}
      markdown={markdown}
      metadata={doc ? <DocumentMetadata doc={doc} /> : undefined}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Granite" url={documentUrl(id)} />
          <Action
            title={withFullText ? "Hide Full Text" : "Show Full Text"}
            icon={Icon.Text}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
            onAction={() => setWithFullText((v) => !v)}
          />
          {doc?.full_text ? (
            <Action.CopyToClipboard
              title="Copy Full Text"
              content={doc.full_text}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          ) : null}
          <Action.CopyToClipboard title="Copy Document ID" content={id} />
        </ActionPanel>
      }
    />
  );
}

function DocumentMetadata({ doc }: { doc: DocumentDetail }) {
  const type = typeLabel(doc);
  return (
    <Detail.Metadata>
      {type ? <Detail.Metadata.Label title="Type" text={type} /> : null}
      <Detail.Metadata.Label title="Status" text={doc.status} />
      {doc.primary_date ? <Detail.Metadata.Label title="Date" text={doc.primary_date.slice(0, 10)} /> : null}
      {doc.tax_year ? <Detail.Metadata.Label title="Tax year" text={String(doc.tax_year)} /> : null}
      {doc.gross_amount ? (
        <Detail.Metadata.Label title="Total" text={`${doc.gross_amount} ${doc.currency ?? ""}`.trim()} />
      ) : null}
      {doc.tax_amount ? (
        <Detail.Metadata.Label title="Tax" text={`${doc.tax_amount} ${doc.currency ?? ""}`.trim()} />
      ) : null}
      <Detail.Metadata.Label title="Vault" text={doc.vault.name} />
      {doc.entities.length ? (
        <Detail.Metadata.TagList title="Entities">
          {doc.entities.map((e) => (
            <Detail.Metadata.TagList.Item key={e.id} text={e.display_name} />
          ))}
        </Detail.Metadata.TagList>
      ) : null}
      {doc.collections.length ? (
        <Detail.Metadata.TagList title="Collections">
          {doc.collections.map((c) => (
            <Detail.Metadata.TagList.Item key={c.id} text={c.name} />
          ))}
        </Detail.Metadata.TagList>
      ) : null}
      {doc.filename ? <Detail.Metadata.Label title="File" text={doc.filename} /> : null}
    </Detail.Metadata>
  );
}
