import { Action, ActionPanel, Cache, Color, Detail, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { useCachedState, usePromise } from "@raycast/utils";
import { useMemo, useRef, useState } from "react";
import { ageInDays, isStale, loadProducts, matches, STALE_AFTER_DAYS } from "./lib/data";
import {
  aboveLow,
  BUY_STATE_LABEL,
  buyState,
  historyMarkdown,
  historyTable,
  longDate,
  money,
  pricePoint,
} from "./lib/format";
import type { Product } from "./lib/types";

const cache = new Cache();

type CategoryFilter = "all" | "ram" | "ssd";

// Named here rather than reaching back into the dropdown's JSX, so the empty
// view can say which category it searched without the two drifting.
const CATEGORY_LABEL: Record<CategoryFilter, string> = {
  all: "any category",
  ram: "RAM",
  ssd: "SSDs",
};

const STATE_COLOR: Record<string, Color> = {
  good: Color.Green,
  typical: Color.SecondaryText,
  elevated: Color.Orange,
};

export default function SearchMemoryPrices() {
  const [showingDetail, setShowingDetail] = useState(false);
  // ONE SOURCE OF TRUTH. This used to be useState plus the dropdown's own
  // storeValue, which are two stores for one value: Raycast restored the
  // dropdown's last selection while React initialised its copy to "all", so on
  // reopen the control showed one category and the list was filtered by
  // another until the reader touched it. useCachedState persists the value and
  // is the value the dropdown renders, so they cannot disagree.
  const [category, setCategory] = useCachedState<CategoryFilter>("category", "all");
  // Filtering is ours rather than Raycast's so the header can state how many
  // rows a query actually matched. It runs over the payload already in memory:
  // no request is made per keystroke.
  const [searchText, setSearchText] = useState("");

  // usePromise's revalidate takes no arguments, so the intent to bypass the
  // cache is parked here and consumed by the next run.
  const forceNextLoad = useRef(false);

  const { data, isLoading, revalidate, error } = usePromise(
    async () => {
      const force = forceNextLoad.current;
      forceNextLoad.current = false;
      const result = await loadProducts({ cache, force });
      if (result.servedFromCacheAfterFailure) {
        // Degrading is not silent: say what happened and how old the data is.
        await showToast({
          style: Toast.Style.Failure,
          title: "Couldn't refresh prices",
          message: `Showing data computed ${longDate(result.payload.generated)}`,
        });
      }
      return result;
    },
    [],
    { failureToastOptions: { title: "Couldn't load prices" } },
  );

  // Refresh must reach the network, not re-read the cache it is refreshing.
  const refresh = () => {
    forceNextLoad.current = true;
    revalidate();
  };

  const payload = data?.payload;
  const products = payload?.products ?? [];
  const query = searchText.trim();
  const filtered = useMemo(() => {
    const byCategory = category === "all" ? products : products.filter((p) => p.category === category);
    return query ? byCategory.filter((p) => matches(p, query)) : byCategory;
  }, [products, category, query]);

  // The date the data was computed rides every view, on the section header,
  // because the site refreshes six times a day and this file does not.
  const stale = payload ? isStale(payload.generated) : false;
  const offline = data?.servedFromCacheAfterFailure ?? false;
  let sectionTitle = "";
  if (payload) {
    const age = ageInDays(payload.generated);
    const dated = `data from ${longDate(payload.generated)}`;
    const count = query
      ? `${filtered.length} ${filtered.length === 1 ? "match" : "matches"} for "${query}"`
      : `${filtered.length} products`;
    sectionTitle = `${count} · ${dated}`;
    if (offline) sectionTitle = `Offline · ${sectionTitle}`;
    if (stale) sectionTitle = `⚠ ${age} days old · ${sectionTitle}`;
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showingDetail}
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search by name, brand or ASIN"
      searchBarAccessory={
        <List.Dropdown tooltip="Category" value={category} onChange={(v) => setCategory(v as CategoryFilter)}>
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item title="RAM" value="ram" />
          <List.Dropdown.Item title="SSDs" value="ssd" />
        </List.Dropdown>
      }
    >
      {error && !payload ? (
        <List.EmptyView
          icon={Icon.WifiDisabled}
          title="Couldn't load prices"
          description={`${error.message}. Check your connection, then try again.`}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={refresh} />
              <Action.OpenInBrowser title="Open MemRadar" url="https://memradar.com" />
            </ActionPanel>
          }
        />
      ) : filtered.length === 0 && payload ? (
        // ONLY reachable on the else branch, so the offline/error view above
        // always takes precedence: the two cannot render together. Gated on
        // `payload` as well, so the empty second between mount and first load
        // does not flash "no products match" at a reader who has not searched.
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No products match"
          description={
            query
              ? `Nothing matches "${query}"${category === "all" ? "" : ` in ${CATEGORY_LABEL[category]}`}. Try fewer words, or a brand or ASIN.`
              : `No products in ${CATEGORY_LABEL[category]}.`
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Search on MemRadar" url="https://memradar.com" icon={Icon.Globe} />
              <Action title="Refresh Data" icon={Icon.ArrowClockwise} onAction={refresh} />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title={sectionTitle}>
          {/* Narrowed on `payload` rather than defaulting these to "": an empty
              attribution is the licensed-data credit silently missing, so a payload
              without one is now rejected on load instead of rendered blank. */}
          {payload
            ? filtered.map((product) => (
                <ProductItem
                  key={product.sku}
                  product={product}
                  payloadGenerated={payload.generated}
                  attribution={payload.attribution}
                  notice={payload.notice}
                  showingDetail={showingDetail}
                  onToggleDetail={() => setShowingDetail((v) => !v)}
                  onRefresh={refresh}
                />
              ))
            : null}
        </List.Section>
      )}
    </List>
  );
}

function ProductItem(props: {
  product: Product;
  payloadGenerated: string;
  attribution: string;
  notice: string;
  showingDetail: boolean;
  onToggleDetail: () => void;
  onRefresh: () => void;
}) {
  const { product, showingDetail } = props;
  const state = buyState(product.buy_state);
  const lowPoint = pricePoint(product.all_time_low);

  return (
    <List.Item
      title={product.name}
      icon={product.category === "ram" ? Icon.MemoryChip : Icon.HardDrive}
      accessories={
        showingDetail
          ? undefined
          : [
              // The buy state is a dot, not a text tag: a tag competes with the
              // price for row width and the price lost, truncating to "$5...".
              // An icon is fixed-width, so the price always renders in full.
              ...(state
                ? [{ icon: { source: Icon.Dot, tintColor: STATE_COLOR[state] }, tooltip: BUY_STATE_LABEL[state] }]
                : []),
              { text: money(product.price_usd), tooltip: "Current price" },
            ]
      }
      detail={<ProductDetail {...props} />}
      actions={
        <ActionPanel>
          {/* The data is the point of this extension, so Enter opens it rather
              than sending the reader to the website. */}
          <Action.Push
            title="Show Price History"
            icon={Icon.LineChart}
            target={
              <ProductDetailView
                product={product}
                payloadGenerated={props.payloadGenerated}
                attribution={props.attribution}
                notice={props.notice}
              />
            }
          />
          <Action.OpenInBrowser
            title="Open on MemRadar"
            url={product.url}
            icon={Icon.Globe}
            shortcut={{ macOS: { modifiers: ["cmd"], key: "return" }, Windows: { modifiers: ["ctrl"], key: "return" } }}
          />
          <Action.CopyToClipboard title="Copy Price" content={money(product.price_usd)} />
          {lowPoint ? <Action.CopyToClipboard title="Copy All-Time Low" content={money(lowPoint.price_usd)} /> : null}
          <Action
            title={showingDetail ? "Hide Side Pane" : "Show Side Pane"}
            icon={Icon.Sidebar}
            shortcut={{ macOS: { modifiers: ["cmd"], key: "d" }, Windows: { modifiers: ["ctrl"], key: "d" } }}
            onAction={props.onToggleDetail}
          />
          <Action
            title="Refresh Data"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={props.onRefresh}
          />
        </ActionPanel>
      }
    />
  );
}

function ProductDetail({
  product,
  payloadGenerated,
  attribution,
  notice,
}: {
  product: Product;
  payloadGenerated: string;
  attribution: string;
  notice: string;
}) {
  const markdown = [`## Monthly price history`, "", historyTable(product), "", `---`, "", notice, "", attribution]
    .join("\n")
    .trim();

  const low = pricePoint(product.all_time_low);
  const high = pricePoint(product.all_time_high);
  const state = buyState(product.buy_state);
  const above = aboveLow(product);
  const stale = payloadGenerated ? isStale(payloadGenerated) : false;

  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Current price" text={money(product.price_usd)} />
          {state ? (
            <List.Item.Detail.Metadata.TagList title="Buy state">
              <List.Item.Detail.Metadata.TagList.Item text={BUY_STATE_LABEL[state]} color={STATE_COLOR[state]} />
            </List.Item.Detail.Metadata.TagList>
          ) : null}
          {low ? (
            <List.Item.Detail.Metadata.Label
              title="All-time low"
              text={`${money(low.price_usd)} · ${longDate(low.date)}`}
            />
          ) : null}
          {above ? <List.Item.Detail.Metadata.Label title="Against that low" text={above} /> : null}
          {high ? (
            <List.Item.Detail.Metadata.Label
              title="All-time high"
              text={`${money(high.price_usd)} · ${longDate(high.date)}`}
            />
          ) : null}
          {product.avg_90d_usd !== undefined ? (
            <List.Item.Detail.Metadata.Label title="90-day average" text={money(product.avg_90d_usd)} />
          ) : null}
          <List.Item.Detail.Metadata.Label title="Tracked" text={`${product.tracked_days} days`} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Data computed"
            text={payloadGenerated ? longDate(payloadGenerated) : "unknown"}
            icon={stale ? { source: Icon.Warning, tintColor: Color.Orange } : undefined}
          />
          {stale ? (
            <List.Item.Detail.Metadata.Label
              title="Warning"
              text={`More than ${STALE_AFTER_DAYS} days old; the site may have newer prices`}
            />
          ) : null}
          <List.Item.Detail.Metadata.Link title="Product page" target={product.url} text="memradar.com" />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

/**
 * The pushed view: everything known about one product, at full width. Same
 * fields as the side pane plus the complete history, and the payload's own
 * attribution and staleness notice, which are rendered rather than restated.
 */
function ProductDetailView({
  product,
  payloadGenerated,
  attribution,
  notice,
}: {
  product: Product;
  payloadGenerated: string;
  attribution: string;
  notice: string;
}) {
  const low = pricePoint(product.all_time_low);
  const high = pricePoint(product.all_time_high);
  const state = buyState(product.buy_state);
  const above = aboveLow(product);
  const stale = payloadGenerated ? isStale(payloadGenerated) : false;

  const markdown = [`# ${product.name}`, "", historyMarkdown(product), "", "---", "", notice, "", attribution]
    .join("\n")
    .trim();

  return (
    <Detail
      navigationTitle={product.name}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Current price" text={money(product.price_usd)} />
          {state ? (
            <Detail.Metadata.TagList title="Buy state">
              <Detail.Metadata.TagList.Item text={BUY_STATE_LABEL[state]} color={STATE_COLOR[state]} />
            </Detail.Metadata.TagList>
          ) : null}
          {product.avg_90d_usd !== undefined ? (
            <Detail.Metadata.Label title="90-day average" text={money(product.avg_90d_usd)} />
          ) : null}
          <Detail.Metadata.Separator />
          {low ? (
            <Detail.Metadata.Label title="All-time low" text={`${money(low.price_usd)} · ${longDate(low.date)}`} />
          ) : null}
          {above ? <Detail.Metadata.Label title="Against that low" text={above} /> : null}
          {high ? (
            <Detail.Metadata.Label title="All-time high" text={`${money(high.price_usd)} · ${longDate(high.date)}`} />
          ) : null}
          <Detail.Metadata.Label title="Tracked" text={`${product.tracked_days} days`} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Data computed"
            text={payloadGenerated ? longDate(payloadGenerated) : "unknown"}
            icon={stale ? { source: Icon.Warning, tintColor: Color.Orange } : undefined}
          />
          {stale ? (
            <Detail.Metadata.Label
              title="Warning"
              text={`More than ${STALE_AFTER_DAYS} days old; the site may have newer prices`}
            />
          ) : null}
          <Detail.Metadata.Link title="Product page" target={product.url} text="memradar.com" />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open on MemRadar" url={product.url} icon={Icon.Globe} />
          <Action.CopyToClipboard title="Copy Price" content={money(product.price_usd)} />
          {low ? <Action.CopyToClipboard title="Copy All-Time Low" content={money(low.price_usd)} /> : null}
        </ActionPanel>
      }
    />
  );
}
