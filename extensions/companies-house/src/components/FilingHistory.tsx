import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { getFilingHistory } from "../api";
import { PAGE_SIZE, WEB_BASE } from "../constants";
import {
  filingCategoryLabel,
  filingDescription,
  filingDescriptionMarkdown,
  formatDate,
} from "../helpers";
import type { FilingItem } from "../types";

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
      {data?.length ? (
        data.map((filing, index) => (
          <FilingRow
            key={filing.transaction_id ?? index}
            filing={filing}
            filingHistoryUrl={filingHistoryUrl}
          />
        ))
      ) : (
        <List.EmptyView title="No filings found" icon={Icon.Document} />
      )}
    </List>
  );
}

function FilingRow({
  filing,
  filingHistoryUrl,
}: {
  filing: FilingItem;
  filingHistoryUrl: string;
}) {
  const title = filingDescription(filing);
  const date = formatDate(filing.date);

  return (
    <List.Item
      title={title}
      accessories={date ? [{ text: date }] : []}
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
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open Filing History on Companies House"
            url={filingHistoryUrl}
          />
          <Action.CopyToClipboard title="Copy Description" content={title} />
        </ActionPanel>
      }
    />
  );
}
