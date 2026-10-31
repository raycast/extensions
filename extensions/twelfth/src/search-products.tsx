import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise, useCachedState, withAccessToken } from "@raycast/utils";
import { useState } from "react";
import { apiKey, authorize, reconnect } from "./lib/auth";
import { appUrl, askUrl } from "./lib/config";
import { money, validZone } from "./vendor/twelfth-shared/index";
import { type WorkspaceContext, workspaceContext } from "./lib/context";
import {
  PRODUCT_SORTS,
  type Figure,
  type Product,
  type ProductPage,
  type ProductSort,
  listProducts,
} from "./lib/twelfth";

const PAGE_SIZE = 50;

function SearchProducts() {
  const [searchText, setSearchText] = useState("");
  const [sort, setSort] = useCachedState<ProductSort>("products.sort", "findings");
  const [showingDetail, setShowingDetail] = useCachedState("products.detail", true);
  // From the first page: whether anything is readable at all, so an empty list
  // can say "nothing in your remits" rather than "no match".
  const [reach, setReach] = useState<Pick<ProductPage, "totalProducts" | "scope">>();

  const { data, error, isLoading, pagination, revalidate } = useCachedPromise(
    (query: string, sort: ProductSort) =>
      async ({ page }: { page: number }) => {
        const result = await listProducts({ query, sort, limit: PAGE_SIZE, offset: page * PAGE_SIZE });
        if (page === 0) setReach({ totalProducts: result.totalProducts, scope: result.scope });
        return { data: result.products, hasMore: result.hasMore };
      },
    [searchText, sort],
    { keepPreviousData: true },
  );
  // Prices are in the workspace's currency, not dollars by default. Without the
  // context the products still list, with bare amounts: no toast for it.
  const { data: context } = useCachedPromise(() => workspaceContext(), [], { onError: () => undefined });

  return (
    <List
      isLoading={isLoading}
      navigationTitle={context?.workspace ? `Search Products · ${context.workspace.name}` : "Search Products"}
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
      {isLoading ? (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="Searching…" />
      ) : (
        <EmptyProducts
          error={error}
          query={searchText.trim()}
          reach={reach}
          workspace={context?.workspace?.name}
          onRetry={revalidate}
        />
      )}
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
          detail={<ProductDetail product={product} context={context} />}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open in Twelfth" url={productUrl(product)} />
              <Action
                title={showingDetail ? "Hide Details" : "Show Details"}
                icon={Icon.Sidebar}
                shortcut={{ macOS: { modifiers: ["cmd"], key: "d" }, Windows: { modifiers: ["ctrl"], key: "d" } }}
                onAction={() => setShowingDetail(!showingDetail)}
              />
              <Action.OpenInBrowser
                title="Ask Twelfth About This Product"
                icon={Icon.SpeechBubble}
                shortcut={{
                  macOS: { modifiers: ["cmd", "shift"], key: "k" },
                  Windows: { modifiers: ["ctrl", "shift"], key: "k" },
                }}
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

/**
 * Why the list is empty, in the order that matters: the read failed, nothing
 * in this workspace is readable (wrong workspace, or no remits), or the search
 * matched nothing.
 */
function EmptyProducts({
  error,
  query,
  reach,
  workspace,
  onRetry,
}: {
  error: Error | undefined;
  query: string;
  reach: Pick<ProductPage, "totalProducts" | "scope"> | undefined;
  workspace: string | undefined;
  onRetry: () => void;
}) {
  const where = workspace ? ` in ${workspace}` : "";
  const actions = (
    <ActionPanel>
      {error ? <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={onRetry} /> : null}
      <Action.OpenInBrowser title="Open Products in Twelfth" url={appUrl("/app/products")} />
      {apiKey() ? null : (
        <Action
          title="Switch Workspace"
          icon={Icon.Switch}
          onAction={async () => {
            await reconnect();
            onRetry();
          }}
        />
      )}
    </ActionPanel>
  );
  if (error) {
    return (
      <List.EmptyView
        icon={Icon.ExclamationMark}
        title="Couldn't load products"
        description={error.message}
        actions={actions}
      />
    );
  }
  if (reach?.totalProducts === 0) {
    return (
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title={`No products${where}`}
        description={
          reach.scope === "remit"
            ? "None of your remits hold products in this workspace. Switch workspace, or ask an admin to add you to a remit."
            : "This workspace has no products loaded yet."
        }
        actions={actions}
      />
    );
  }
  return (
    <List.EmptyView
      icon={Icon.MagnifyingGlass}
      title={query ? `No products match "${query}"${where}` : `No products${where}`}
      description={reach?.scope === "remit" ? "Only products in your remits are searched." : undefined}
      actions={actions}
    />
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

function ProductDetail({ product, context }: { product: Product; context: WorkspaceContext | undefined }) {
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
          <Label title="Price" text={money(position.price, context?.currency)} />
          <Label title="GP%" text={position.gpPct === null ? "—" : `${position.gpPct.toFixed(1)}%`} />
          {position.asOf ? <Label title="As of" text={asOfDate(position.asOf, context?.timeZone)} /> : null}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

/** The data date as a calendar day in the workspace, not on this machine's clock. */
function asOfDate(asOf: string, timeZone: string | undefined) {
  const at = new Date(asOf);
  if (Number.isNaN(at.getTime())) return "—";
  return new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeZone: validZone(timeZone) }).format(at);
}

/** Unmeasured figures are null, never zero, and show as a dash. */
function number(value: Figure, digits = 0) {
  if (value === null || value === undefined) return "—";
  return value.toLocaleString("en-AU", { maximumFractionDigits: digits });
}

export default withAccessToken({ authorize })(SearchProducts);
