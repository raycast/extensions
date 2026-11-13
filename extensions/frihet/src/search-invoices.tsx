import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildFrihetDeepLink,
  formatAmountSource,
  formatCurrencyAmount,
  FrihetApiError,
  resolveDocumentAmount,
} from "./lib/frihet-client.js";
import {
  clearActiveWorkspaceCache,
  createClientFromPreferences,
} from "./lib/runtime-client.js";
import type { InvoiceRecord, InvoiceStatus } from "./lib/types.js";

const PAGE_LIMIT = 20;

function statusBadge(status?: InvoiceStatus): { value: string; color: Color } {
  const normalized = (status ?? "draft").toLowerCase();
  switch (normalized) {
    case "paid":
      return { value: "Paid", color: Color.Green };
    case "overdue":
      return { value: "Overdue", color: Color.Red };
    case "sent":
      return { value: "Sent", color: Color.Blue };
    case "cancelled":
      return { value: "Cancelled", color: Color.SecondaryText };
    case "draft":
    default:
      return { value: "Draft (Not Issued)", color: Color.Orange };
  }
}

function renderInvoiceMarkdown(invoice: InvoiceRecord): string {
  const numberLabel =
    invoice.invoiceNumber ?? invoice.documentNumber ?? invoice.id;
  const resolved = resolveDocumentAmount(invoice, invoice.currency ?? "EUR");
  const lines: string[] = [
    `# Invoice ${numberLabel}`,
    "",
    `**Client:** ${invoice.clientName}  `,
    `**Status:** \`${(invoice.status ?? "draft").toUpperCase()}\`  `,
    `**Issue Date:** ${invoice.issueDate ?? "—"} · **Due Date:** ${invoice.dueDate ?? "—"}  `,
    `**Total:** **${formatCurrencyAmount(resolved.amount, resolved.currency)}**  `,
    `**Amount source:** ${formatAmountSource(resolved.provenance)}`,
    "",
  ];

  if (invoice.status === "draft" || !invoice.status) {
    lines.push(
      "> **Draft:** This document has not been issued and does not count toward issued revenue.",
      "",
    );
  }

  if (Array.isArray(invoice.items) && invoice.items.length > 0) {
    lines.push(
      "## Line Items",
      "",
      "| Description | Qty | Unit Price | Discount | Line Subtotal |",
      "|---|---:|---:|---:|---:|",
    );
    for (const item of invoice.items) {
      const gross = (item.quantity ?? 0) * (item.unitPrice ?? 0);
      const discountPct =
        typeof item.discount === "number"
          ? item.discount
          : typeof (item as { discountRate?: number }).discountRate === "number"
            ? (item as { discountRate?: number }).discountRate!
            : 0;
      const subtotal = gross * (1 - discountPct / 100);
      const discountText = discountPct > 0 ? `${discountPct}%` : "—";
      lines.push(
        `| ${item.description} | ${item.quantity} | ${formatCurrencyAmount(item.unitPrice, resolved.currency)} | ${discountText} | ${formatCurrencyAmount(subtotal, resolved.currency)} |`,
      );
    }
    lines.push("");
  } else {
    lines.push(
      "_Select **Load Full Line Items** from Actions to see the complete invoice._",
      "",
    );
  }

  if (invoice.notes) {
    lines.push("## Notes", "", invoice.notes, "");
  }

  return lines.join("\n");
}

export default function SearchInvoicesCommand() {
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [detailedById, setDetailedById] = useState<
    Record<string, InvoiceRecord>
  >({});
  const [total, setTotal] = useState<number>(0);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<FrihetApiError | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchInvoices = useCallback(
    async (opts?: {
      cursor?: string;
      append?: boolean;
      bypassCache?: boolean;
    }) => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
      const controller = new AbortController();
      abortRef.current = controller;
      setIsLoading(true);
      setError(null);

      try {
        const client = createClientFromPreferences();
        const page = await client.listInvoices({
          q: searchText,
          status: statusFilter,
          limit: PAGE_LIMIT,
          after: opts?.cursor,
          bypassCache: opts?.bypassCache,
          signal: controller.signal,
        });

        setInvoices((prev) =>
          opts?.append ? [...prev, ...page.data] : page.data,
        );
        setTotal(page.total);
        setNextCursor(page.nextCursor);
      } catch (err) {
        if (
          err instanceof FrihetApiError &&
          err.errorCode === "request_aborted"
        ) {
          return;
        }
        const apiErr =
          err instanceof FrihetApiError
            ? err
            : new FrihetApiError(
                500,
                "unexpected_error",
                err instanceof Error ? err.message : String(err),
              );
        if (!opts?.append) {
          setInvoices([]);
        }
        setError(apiErr);
        await showToast({
          style: Toast.Style.Failure,
          title: "Could not load invoices",
          message: apiErr.remediation,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [searchText, statusFilter],
  );

  useEffect(() => {
    void fetchInvoices();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchInvoices]);

  const loadInvoiceDetail = useCallback(
    async (invoiceId: string) => {
      if (detailedById[invoiceId]) return;
      try {
        const client = createClientFromPreferences();
        const detailed = await client.getInvoice(invoiceId);
        setDetailedById((prev) => ({ ...prev, [invoiceId]: detailed }));
      } catch (err) {
        const message =
          err instanceof FrihetApiError
            ? err.remediation
            : "Could not load invoice line items.";
        await showToast({
          style: Toast.Style.Failure,
          title: "Detail fetch failed",
          message,
        });
      }
    },
    [detailedById],
  );

  const deepLinkUrl = buildFrihetDeepLink("invoices");
  const isPartialPage = Boolean(nextCursor) || total > invoices.length;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={invoices.length > 0}
      searchBarPlaceholder="Search invoices by client name or document number..."
      onSearchTextChange={setSearchText}
      throttle
      onSelectionChange={(id) => {
        if (id && !id.startsWith("action:")) {
          void loadInvoiceDetail(id);
        }
      }}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Invoice Status"
          value={statusFilter}
          onChange={(newValue) => setStatusFilter(newValue)}
        >
          <List.Dropdown.Item title="All Statuses" value="all" />
          <List.Dropdown.Item title="Draft (Not Issued)" value="draft" />
          <List.Dropdown.Item title="Sent (Open)" value="sent" />
          <List.Dropdown.Item title="Overdue" value="overdue" />
          <List.Dropdown.Item title="Paid" value="paid" />
          <List.Dropdown.Item title="Cancelled" value="cancelled" />
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title={
            error.isAuthError
              ? "Authentication Required (401)"
              : `Unable to Load Invoices (${error.statusCode})`
          }
          description={error.remediation}
          actions={
            <ActionPanel>
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={() => void openExtensionPreferences()}
              />
              <Action
                title="Retry Request"
                icon={Icon.RotateClockwise}
                onAction={() => void fetchInvoices({ bypassCache: true })}
              />
              <Action.OpenInBrowser
                title="Open Frihet Invoices"
                url={deepLinkUrl}
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          icon={Icon.Document}
          title="No Matching Invoices"
          description={
            searchText || statusFilter !== "all"
              ? `No invoices matched query "${searchText}" with status "${statusFilter}".`
              : "No invoices found in this Frihet workspace."
          }
          actions={
            <ActionPanel>
              <Action
                title="Refresh Invoices"
                icon={Icon.RotateClockwise}
                onAction={() => void fetchInvoices({ bypassCache: true })}
              />
              <Action.OpenInBrowser
                title="Open Frihet Invoices"
                url={deepLinkUrl}
              />
            </ActionPanel>
          }
        />
      )}

      <List.Section
        title="Invoices"
        subtitle={
          isPartialPage
            ? `Showing ${invoices.length} of ${total} invoices (Partial Page)`
            : `${invoices.length} of ${total} invoices (Complete)`
        }
      >
        {invoices.map((summaryRow) => {
          const inv = detailedById[summaryRow.id] ?? summaryRow;
          const docNum = inv.invoiceNumber ?? inv.documentNumber ?? inv.id;
          const badge = statusBadge(inv.status);
          const resolvedAmount = resolveDocumentAmount(
            inv,
            inv.currency ?? "EUR",
          );
          const amountTag =
            resolvedAmount.provenance === "unavailable"
              ? "Amount unavailable"
              : formatCurrencyAmount(
                  resolvedAmount.amount,
                  resolvedAmount.currency,
                );

          return (
            <List.Item
              key={inv.id}
              id={inv.id}
              icon={{ source: Icon.Document, tintColor: badge.color }}
              title={docNum}
              accessories={[
                { tag: { value: badge.value, color: badge.color } },
                {
                  text: amountTag,
                  tooltip: formatAmountSource(resolvedAmount.provenance),
                },
              ]}
              detail={
                <List.Item.Detail
                  markdown={renderInvoiceMarkdown(inv)}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Document Number"
                        text={docNum}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Invoice ID"
                        text={inv.id}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Client"
                        text={inv.clientName}
                      />
                      <List.Item.Detail.Metadata.TagList title="Status">
                        <List.Item.Detail.Metadata.TagList.Item
                          text={badge.value}
                          color={badge.color}
                        />
                      </List.Item.Detail.Metadata.TagList>
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="Issue Date"
                        text={inv.issueDate ?? "—"}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Due Date"
                        text={inv.dueDate ?? "—"}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Tax Rate"
                        text={
                          typeof inv.taxRate === "number"
                            ? `${inv.taxRate}%`
                            : "—"
                        }
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Total Amount"
                        text={
                          resolvedAmount.provenance === "unavailable"
                            ? "Not on summary row"
                            : formatCurrencyAmount(
                                resolvedAmount.amount,
                                resolvedAmount.currency,
                              )
                        }
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Amount Source"
                        text={formatAmountSource(resolvedAmount.provenance)}
                      />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Invoice Actions">
                    <Action.OpenInBrowser
                      title="Open in Frihet"
                      url={deepLinkUrl}
                    />
                    <Action.CopyToClipboard
                      title="Copy Invoice Number"
                      content={docNum}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    <Action.CopyToClipboard
                      title="Copy Invoice ID"
                      content={inv.id}
                      shortcut={Keyboard.Shortcut.Common.Copy}
                    />
                    <Action
                      title="Load Full Line Items"
                      icon={Icon.Download}
                      onAction={() => void loadInvoiceDetail(inv.id)}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Workspace & Pagination">
                    {nextCursor ? (
                      <Action
                        title={`Load Next Page (${invoices.length}/${total})`}
                        icon={Icon.ArrowDown}
                        onAction={() =>
                          void fetchInvoices({
                            cursor: nextCursor,
                            append: true,
                          })
                        }
                      />
                    ) : null}
                    <Action
                      title="Refresh & Clear Workspace Cache"
                      icon={Icon.RotateClockwise}
                      shortcut={Keyboard.Shortcut.Common.Refresh}
                      onAction={() => {
                        clearActiveWorkspaceCache();
                        setDetailedById({});
                        void fetchInvoices({ bypassCache: true });
                      }}
                    />
                    <Action
                      title="Open Extension Preferences"
                      icon={Icon.Gear}
                      onAction={() => void openExtensionPreferences()}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
