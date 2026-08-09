import { Action, ActionPanel, Detail, Keyboard } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo } from "react";
import { createClient } from "../api/client";
import { fetchDocumentLines, type DocumentDetailData } from "../api/documents";
import type { DocumentKind } from "../api/types";
import { documentPdfUrl, documentUrl } from "../api/urls";
import { formatLongDate, formatMoney, formatQuantity } from "../format";
import { getConfig, getDisplayLocale, getWebBaseUrl } from "../preferences";
import { OPEN_IN_BROWSER } from "../shortcuts";

/**
 * Rendered as blocks rather than a table: the metadata pane takes a third of the width, leaving a
 * four-column table so narrow that Raycast wrapped headers mid-word and split "600" into "60 0".
 */
function toMarkdown(data: DocumentDetailData, locale: string): string {
  if (data.lines.length === 0) {
    return `# ${data.ref}\n\n_This document has no line items._`;
  }

  const blocks = data.lines.map((line) => {
    const label = line.label.replace(/\s*\n+\s*/g, " ").trim();
    const calculation =
      line.qty === 1
        ? formatMoney(line.total, data.currency, locale)
        : `${formatQuantity(line.qty, locale)}\u00A0×\u00A0${formatMoney(line.unitPrice, data.currency, locale)}` +
          `  =  **${formatMoney(line.total, data.currency, locale)}**`;
    return `**${label}**\n\n${calculation}`;
  });

  return [`# ${data.ref}`, ...blocks].join("\n\n");
}

export function DocumentDetail({ kind, id, documentRef }: { kind: DocumentKind; id: number; documentRef: string }) {
  const web = useMemo(() => getWebBaseUrl(), []);
  const locale = useMemo(() => getDisplayLocale(), []);

  const { data, isLoading, error } = usePromise(
    async (documentKind: DocumentKind, documentId: number) =>
      fetchDocumentLines(createClient(getConfig()), documentKind, documentId),
    [kind, id],
  );

  const markdown = error
    ? `# ${documentRef}\n\nThe document could not be loaded.\n\n${error.message}`
    : data
      ? toMarkdown(data, locale)
      : `# ${documentRef}`;

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={documentRef}
      markdown={markdown}
      metadata={
        data ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Net" text={formatMoney(data.totalHt, data.currency, locale)} />
            <Detail.Metadata.Label title="VAT" text={formatMoney(data.totalTva, data.currency, locale)} />
            <Detail.Metadata.Label title="Gross" text={formatMoney(data.totalTtc, data.currency, locale)} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Date" text={data.date ? formatLongDate(data.date, locale) : "—"} />
            <Detail.Metadata.Label title="Customer reference" text={data.refClient ?? "—"} />
          </Detail.Metadata>
        ) : null
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Dolibarr" url={documentUrl(web, kind, id)} />
          <Action.OpenInBrowser
            title="Open PDF"
            url={documentPdfUrl(web, kind, data?.ref ?? documentRef)}
            shortcut={OPEN_IN_BROWSER}
          />
          <Action.CopyToClipboard
            title="Copy Reference"
            content={documentRef}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
        </ActionPanel>
      }
    />
  );
}
