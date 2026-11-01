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
  formatCurrencyAmount,
  FrihetApiError,
  isProductEffectivelyActive,
} from "./lib/frihet-client.js";
import {
  clearActiveWorkspaceCache,
  createClientFromPreferences,
} from "./lib/runtime-client.js";
import type { ProductActiveFilter, ProductRecord } from "./lib/types.js";

const PAGE_LIMIT = 25;

function renderProductMarkdown(
  product: ProductRecord,
  usedFallback: boolean,
): string {
  const active = isProductEffectivelyActive(product);
  const currency = product.currency ?? "EUR";
  const statusDetail =
    product.isActive === undefined
      ? "Active (legacy record: `isActive` omitted)"
      : product.isActive
        ? "Active (`isActive: true`)"
        : "Inactive (`isActive: false`)";

  const lines: string[] = [
    `# ${product.name}`,
    "",
    `**Unit Price:** **${formatCurrencyAmount(product.unitPrice, currency)}**  `,
    `**Tax Rate:** ${typeof product.taxRate === "number" ? `${product.taxRate}%` : "Workspace Default"}  `,
    `**Status:** ${active ? "Active" : "Inactive"} — _${statusDetail}_  `,
    ...(product.sku ? [`**SKU:** \`${product.sku}\`  `] : []),
    "",
  ];

  if (product.description) {
    lines.push("## Description", "", product.description, "");
  }

  if (usedFallback) {
    lines.push(
      "> **Compatibility Note:** Filtered client-side from `GET /v1/products` while backend `?isActive` filter stabilization (ERP #2944) is pending deployment.",
      "",
    );
  }

  return lines.join("\n");
}

export default function SearchProductsCommand() {
  const [searchText, setSearchText] = useState("");
  const [activeFilter, setActiveFilter] =
    useState<ProductActiveFilter>("active");
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [usedFallback, setUsedFallback] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<FrihetApiError | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchProducts = useCallback(
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
        const api = createClientFromPreferences();
        const result = await api.searchProducts({
          q: searchText,
          activeFilter,
          limit: PAGE_LIMIT,
          after: opts?.cursor,
          bypassCache: opts?.bypassCache,
          signal: controller.signal,
        });

        setProducts((prev) =>
          opts?.append ? [...prev, ...result.data] : result.data,
        );
        setTotal(result.total);
        setNextCursor(result.nextCursor);
        setUsedFallback(result.usedClientFallback);
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
          setProducts([]);
        }
        setError(apiErr);
        await showToast({
          style: Toast.Style.Failure,
          title: "Could not load products",
          message: apiErr.remediation,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [searchText, activeFilter],
  );

  useEffect(() => {
    void fetchProducts();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchProducts]);

  const deepLinkUrl = buildFrihetDeepLink("products");
  const isPartialPage = Boolean(nextCursor) || total > products.length;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={products.length > 0}
      searchBarPlaceholder="Search catalogue products and services by name or SKU..."
      onSearchTextChange={setSearchText}
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Active Status"
          value={activeFilter}
          onChange={(val) => setActiveFilter(val as ProductActiveFilter)}
        >
          <List.Dropdown.Item
            title="Active Products (Incl. Legacy)"
            value="active"
          />
          <List.Dropdown.Item title="All Products" value="all" />
          <List.Dropdown.Item title="Inactive Only" value="inactive" />
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title={
            error.isAuthError
              ? "Authentication Required (401)"
              : `Unable to Load Products (${error.statusCode})`
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
                onAction={() => void fetchProducts({ bypassCache: true })}
              />
              <Action.OpenInBrowser
                title="Open Frihet Products"
                url={deepLinkUrl}
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          icon={Icon.Box}
          title="No Matching Products"
          description={
            searchText || activeFilter !== "all"
              ? `No catalogue items matched "${searchText}" (${activeFilter}).`
              : "Your Frihet product & service catalogue is empty."
          }
          actions={
            <ActionPanel>
              <Action
                title="Refresh Catalogue"
                icon={Icon.RotateClockwise}
                onAction={() => void fetchProducts({ bypassCache: true })}
              />
              <Action.OpenInBrowser
                title="Open Frihet Products"
                url={deepLinkUrl}
              />
            </ActionPanel>
          }
        />
      )}

      <List.Section
        title="Catalogue Products & Services"
        subtitle={
          isPartialPage
            ? `Showing ${products.length} of ${total} items (Partial Page)${usedFallback ? " · Client-side active filter" : ""}`
            : `${products.length} of ${total} items${usedFallback ? " · Client-side active filter" : ""}`
        }
      >
        {products.map((prod) => {
          const active = isProductEffectivelyActive(prod);
          const currency = prod.currency ?? "EUR";
          const priceFormatted = formatCurrencyAmount(prod.unitPrice, currency);
          const taxTag =
            typeof prod.taxRate === "number"
              ? `${prod.taxRate}% tax`
              : "Default tax";

          return (
            <List.Item
              key={prod.id}
              id={prod.id}
              icon={{
                source: Icon.Box,
                tintColor: active ? Color.Green : Color.SecondaryText,
              }}
              title={prod.name}
              subtitle={prod.sku ?? ""}
              accessories={[
                {
                  tag: {
                    value: active
                      ? prod.isActive === undefined
                        ? "Active (Legacy)"
                        : "Active"
                      : "Inactive",
                    color: active ? Color.Green : Color.SecondaryText,
                  },
                },
                { text: `${priceFormatted} · ${taxTag}` },
              ]}
              detail={
                <List.Item.Detail
                  markdown={renderProductMarkdown(prod, usedFallback)}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Product Name"
                        text={prod.name}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Product ID"
                        text={prod.id}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="SKU"
                        text={prod.sku ?? "—"}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Unit Price"
                        text={priceFormatted}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Tax Rate"
                        text={taxTag}
                      />
                      <List.Item.Detail.Metadata.TagList title="Status">
                        <List.Item.Detail.Metadata.TagList.Item
                          text={
                            prod.isActive === undefined
                              ? "Active (isActive omitted)"
                              : prod.isActive
                                ? "Active"
                                : "Inactive"
                          }
                          color={active ? Color.Green : Color.SecondaryText}
                        />
                      </List.Item.Detail.Metadata.TagList>
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Product Actions">
                    <Action.OpenInBrowser
                      title="Open in Frihet"
                      url={deepLinkUrl}
                    />
                    <Action.CopyToClipboard
                      title="Copy Product Name"
                      content={prod.name}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    <Action.CopyToClipboard
                      title="Copy Unit Price"
                      content={String(prod.unitPrice)}
                      shortcut={Keyboard.Shortcut.Common.Copy}
                    />
                    <Action.CopyToClipboard
                      title="Copy Product ID"
                      content={prod.id}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Workspace & Pagination">
                    {nextCursor ? (
                      <Action
                        title={`Load Next Page (${products.length}/${total})`}
                        icon={Icon.ArrowDown}
                        onAction={() =>
                          void fetchProducts({
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
                        void fetchProducts({ bypassCache: true });
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
