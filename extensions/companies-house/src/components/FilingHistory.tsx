import {
  Action,
  ActionPanel,
  Icon,
  Keyboard,
  List,
  Toast,
  open,
  showInFinder,
  showToast,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import {
  documentIdFromLink,
  fetchDocumentContent,
  getDocumentMetadata,
  getFilingHistory,
} from "../api";
import { PAGE_SIZE, WEB_BASE } from "../constants";
import {
  filingCategoryLabel,
  filingDescription,
  filingDescriptionMarkdown,
  filingDocumentWebUrl,
  formatDate,
} from "../helpers";
import type { FilingItem } from "../types";

/** Media types the Document API serves, in the order worth trying. */
const PREFERRED_MEDIA_TYPES = [
  "application/pdf",
  "application/xhtml+xml",
  "application/json",
  "text/csv",
];

const EXTENSIONS: Record<string, string> = {
  "application/pdf": "pdf",
  "application/xhtml+xml": "xhtml",
  "application/json": "json",
  "text/csv": "csv",
};

export function FilingHistory({
  companyNumber,
  companyName,
}: {
  companyNumber: string;
  companyName?: string;
}) {
  const { isLoading, data, pagination } = useCachedPromise(
    (company: string) => async (options: { page: number }) => {
      const startIndex = options.page * PAGE_SIZE;
      const res = await getFilingHistory(company, startIndex);
      const items = res.items ?? [];
      const total = res.total_count ?? items.length;
      return { data: items, hasMore: startIndex + items.length < total };
    },
    [companyNumber],
  );

  const filingHistoryUrl = `${WEB_BASE}/company/${encodeURIComponent(companyNumber)}/filing-history`;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      pagination={pagination}
      navigationTitle={
        companyName ? `${companyName} — Filing History` : "Filing History"
      }
      searchBarPlaceholder="Filter filings…"
    >
      {isLoading && !data?.length
        ? null
        : (data ?? []).map((filing, index) => (
            <FilingRow
              key={filing.transaction_id ?? index}
              filing={filing}
              companyNumber={companyNumber}
              filingHistoryUrl={filingHistoryUrl}
            />
          ))}
      <List.EmptyView
        title="No Filings Found"
        description="The filing history holds every document a company has filed with Companies House. None is recorded here."
        icon={Icon.Document}
      />
    </List>
  );
}

/**
 * Saves the filed document into ~/Downloads.
 *
 * The Document API answers the content request with a redirect to a
 * short-lived signed URL, which the API layer follows without the Companies
 * House credential. Opening the authenticated content URL in a browser instead
 * would only ever produce a 401, which is why the browser action uses the
 * public viewer.
 */
async function downloadDocument(documentLink: string, fallbackName: string) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Downloading Document",
  });

  try {
    const documentId = documentIdFromLink(documentLink);
    const metadata = await getDocumentMetadata(documentId);
    const available = Object.keys(metadata.resources ?? {});
    const mediaType =
      PREFERRED_MEDIA_TYPES.find((type) => available.includes(type)) ??
      available[0];

    if (!mediaType) {
      toast.style = Toast.Style.Failure;
      toast.title = "No Document to Download";
      toast.message = "Companies House holds no file for this filing.";
      return;
    }

    const { bytes, contentType } = await fetchDocumentContent(
      documentId,
      mediaType,
    );
    const extension = EXTENSIONS[contentType] ?? EXTENSIONS[mediaType] ?? "bin";
    const base = (metadata.filename ?? fallbackName)
      .replace(/[/\\:]/g, "-")
      .replace(/\.[a-z0-9]+$/i, "");
    const path = join(homedir(), "Downloads", `${base}.${extension}`);

    await writeFile(path, bytes);

    toast.style = Toast.Style.Success;
    toast.title = "Document Downloaded";
    toast.message = `${base}.${extension}`;
    toast.primaryAction = {
      title: "Open Document",
      onAction: () => void open(path),
    };
    toast.secondaryAction = {
      title: "Show in Finder",
      onAction: () => void showInFinder(path),
    };
  } catch (error) {
    await showFailureToast(error, { title: "Could Not Download Document" });
  }
}

function FilingRow({
  filing,
  companyNumber,
  filingHistoryUrl,
}: {
  filing: FilingItem;
  companyNumber: string;
  filingHistoryUrl: string;
}) {
  const title = filingDescription(filing);
  const date = formatDate(filing.date);
  // Companies House omits `document_metadata` when it holds no scan of the
  // filing, which is common for older paper filings. Offering a download that
  // could only fail would be worse than not offering one.
  const documentLink = filing.links?.document_metadata;
  const documentUrl =
    documentLink && filing.transaction_id
      ? filingDocumentWebUrl(companyNumber, filing.transaction_id)
      : undefined;

  const accessories: List.Item.Accessory[] = [];
  if (documentLink) {
    accessories.push({ icon: Icon.Paperclip, tooltip: "Document available" });
  }
  if (date) accessories.push({ text: date });

  return (
    <List.Item
      title={title}
      accessories={accessories}
      detail={
        <List.Item.Detail
          markdown={filingDescriptionMarkdown(filing)}
          metadata={
            <List.Item.Detail.Metadata>
              {filing.date ? (
                <List.Item.Detail.Metadata.Label
                  title="Date"
                  text={formatDate(filing.date)}
                />
              ) : null}
              {filing.category ? (
                <List.Item.Detail.Metadata.Label
                  title="Category"
                  text={filingCategoryLabel(filing.category)}
                />
              ) : null}
              {filing.subcategory ? (
                <List.Item.Detail.Metadata.Label
                  title="Subcategory"
                  text={filingCategoryLabel(filing.subcategory)}
                />
              ) : null}
              {filing.type ? (
                <List.Item.Detail.Metadata.Label
                  title="Form"
                  text={filing.type}
                />
              ) : null}
              {filing.pages ? (
                <List.Item.Detail.Metadata.Label
                  title="Pages"
                  text={String(filing.pages)}
                />
              ) : null}
              {filing.paper_filed ? (
                <List.Item.Detail.Metadata.Label
                  title="Filed on Paper"
                  text="Yes"
                />
              ) : null}
              <List.Item.Detail.Metadata.Label
                title="Document"
                text={documentLink ? "Available" : "Not held"}
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          {documentUrl ? (
            <Action.OpenInBrowser
              title="Open Document in Browser"
              icon={Icon.Document}
              url={documentUrl}
            />
          ) : null}
          {documentLink ? (
            <Action
              title="Download Document"
              icon={Icon.Download}
              shortcut={{
                macOS: { modifiers: ["cmd"], key: "d" },
                Windows: { modifiers: ["ctrl"], key: "d" },
              }}
              onAction={() =>
                void downloadDocument(
                  documentLink,
                  `${companyNumber}-${filing.transaction_id ?? "filing"}`,
                )
              }
            />
          ) : null}
          <Action.OpenInBrowser
            title="Open Filing History on Companies House"
            url={filingHistoryUrl}
          />
          <Action.CopyToClipboard
            title="Copy Description"
            content={title}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
        </ActionPanel>
      }
    />
  );
}
