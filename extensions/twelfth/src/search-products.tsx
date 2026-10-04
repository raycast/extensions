import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise, useCachedState, withAccessToken } from "@raycast/utils";
import { useState } from "react";
import { authorize } from "./lib/auth";
import { appUrl, askUrl } from "./lib/config";
import { workspaceContext } from "./lib/context";
import { money } from "./lib/format";
import { PRODUCT_SORTS, type Figure, type Product, type ProductSort, listProducts } from "./lib/twelfth";

const PAGE_SIZE = 50;

function SearchProducts() {
  const [searchText, setSearchText] = useState("");
  const [sort, setSort] = useCachedState<ProductSort>("products.sort", "findings");
  const [showingDetail, setShowingDetail] = useCachedState("products.detail", true);

  const { data, isLoading, pagination, revalidate } = useCachedPromise(
    (query: string, sort: ProductSort) =>
      async ({ page }: { page: number }) => {
        const result = await listProducts({ query, sort, limit: PAGE_SIZE, offset: page * PAGE_SIZE });
        return { data: result.products, hasMore: result.hasMore };
      },
    [searchText, sort],
    { keepPreviousData: true },
  );
  // Prices are in the workspace's currency, not dollars by default.
  const { data: context } = useCachedPromise(() => workspaceContext());
  const currency = context?.currency;

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      throttle
      filtering={false}
      onSearchTextChange={setSearchText}
      isShowingDetail={showingDetail && Boolean(data?.length)}
      searchBarPlaceholder="Search by name, SKU, brand or supplier…"
      searchBarAccessory={
        <List.Dropdown tooltip="Sort" value={sort} onChange={(value) => setSort(value as ProductSort)}>
          {(Object.keys(PRODUCT_SORTS) as ProductSort[]).map((key) => (
            <List.Dropdown.Item key={key} title={PRODUCT_SORTS[key].label} value={key} />
          ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title={isLoading ? "Searching…" : "No matching products"}
        description={isLoading ? undefined : "Only products in your remits are searched."}
      />
      {data?.map((product) => (
        <List.Item
          key={product.sku}
          title={product.name}
          subtitle={showingDetail ? undefined : product.sku}
          icon={
            product.openFindings
              ? { source: Icon.Dot, tintColor: Color.Red, tooltip: `${product.openFindings} open findings` }
              : { source: Icon.Dot, tintColor: Color.SecondaryText }
          }
          accessories={showingDetail ? [] : rowAccessories(product)}
          detail={<ProductDetail product={product} currency={currency} />}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open in Twelfth" url={productUrl(product)} />
              <Action
                title={showingDetail ? "Hide Details" : "Show Details"}
                icon={Icon.Sidebar}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
                onAction={() => setShowingDetail(!showingDetail)}
              />
              <Action.OpenInBrowser
                title="Ask Twelfth About This Product"
                icon={Icon.SpeechBubble}
                shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
                url={askUrl(`How is ${product.name} (SKU ${product.sku}) tracking, and what should I do about it?`)}
              />
              <ActionPanel.Section>
                <Action.CopyToClipboard title="Copy SKU" content={product.sku} />
                <Action.CopyToClipboard
                  title="Copy Link"
                  content={productUrl(product)}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={revalidate}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function productUrl(product: Product) {
  return product.url ?? appUrl(product.path);
}

function rowAccessories(product: Product): List.Item.Accessory[] {
  const { position } = product;
  return [
    ...(product.openFindings
      ? [{ tag: { value: `${product.openFindings} findings`, color: Color.Red } } as List.Item.Accessory]
      : []),
    { text: `SOH ${number(position.stockOnHand)}`, tooltip: "Stock on hand" },
    { text: `${number(position.daysCover)}d cover`, tooltip: "Days of cover" },
  ];
}

function ProductDetail({ product, currency }: { product: Product; currency: string | undefined }) {
  const { position } = product;
  const Label = List.Item.Detail.Metadata.Label;
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <Label title={product.name} />
          <Label title="SKU" text={product.sku} />
          <Label title="Category" text={product.category.label} />
          <Label title="Supplier" text={product.supplier ?? "—"} />
          <Label title="Remit" text={product.remit.label} />
          {product.labels.length ? (
            <List.Item.Detail.Metadata.TagList title="Labels">
              {product.labels.map((label) => (
                <List.Item.Detail.Metadata.TagList.Item key={label} text={label} />
              ))}
            </List.Item.Detail.Metadata.TagList>
          ) : null}
          <List.Item.Detail.Metadata.Separator />
          <Label
            title="Open findings"
            text={{ value: String(product.openFindings), color: product.openFindings ? Color.Red : undefined }}
          />
          <Label title="Stock on hand" text={number(position.stockOnHand)} />
          <Label title="On order" text={number(position.onOrder)} />
          <Label title="Days of cover" text={number(position.daysCover)} />
          <Label title="Velocity (units/day)" text={number(position.velocityPerDay, 2)} />
          <Label title="Units, last 4 weeks" text={number(position.unitsL4w)} />
          <Label title="Units, last year" text={number(position.unitsL1y)} />
          <Label title="Days since sold" text={number(position.daysSinceSold)} />
          <Label title="Price" text={money(position.price, currency)} />
          <Label title="GP%" text={position.gpPct === null ? "—" : `${position.gpPct.toFixed(1)}%`} />
          {position.asOf ? <Label title="As of" text={new Date(position.asOf).toLocaleDateString("en-AU")} /> : null}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

/** Unmeasured figures are null, never zero, and show as a dash. */
function number(value: Figure, digits = 0) {
  if (value === null || value === undefined) return "—";
  return value.toLocaleString("en-AU", { maximumFractionDigits: digits });
}

export default withAccessToken({ authorize })(SearchProducts);
