import { Action, ActionPanel, Color, Icon, Image, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { APIError, dealCategories, searchDeals } from "./api";
import { DealDetailView, formatValue } from "./components/DealDetailView";
import { DealRequestForm } from "./components/DealRequestForm";
import { Deal } from "./types";

// Members without deals on the site get a 404 here too.
const unavailable = (error?: Error) => error instanceof APIError && error.notFound;

export default function Command() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  // The filter is an extra: if categories fail to load, search still works.
  const { data: categories } = useCachedPromise(dealCategories, [], { onError: console.error });

  const {
    data: deals,
    isLoading,
    error,
    pagination,
  } = useCachedPromise(
    (q: string, category: string) =>
      async ({ cursor }: { cursor?: string }) => {
        const page = await searchDeals({ q, category, cursor });
        return { data: page.data, hasMore: page.has_more, cursor: page.next_cursor ?? undefined };
      },
    [query, category],
    { keepPreviousData: true, onError: (error) => (unavailable(error) ? undefined : console.error(error)) },
  );

  const requestDeal = (
    <Action.Push
      title={query ? `Request a Deal for “${query}”` : "Request a Deal"}
      icon={Icon.Megaphone}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<DealRequestForm productName={query} />}
    />
  );

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      throttle
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search deals on software…"
      searchBarAccessory={
        categories?.length ? (
          <List.Dropdown tooltip="Category" onChange={setCategory}>
            <List.Dropdown.Item title="All Categories" value="" />
            <List.Dropdown.Section>
              {categories.map((category) => (
                <List.Dropdown.Item key={category.slug} title={category.name} value={category.slug} />
              ))}
            </List.Dropdown.Section>
          </List.Dropdown>
        ) : undefined
      }
    >
      {unavailable(error) ? (
        <List.EmptyView icon={Icon.Lock} title="Deals aren't available for your account yet" />
      ) : error ? (
        <List.EmptyView icon={Icon.ExclamationMark} title="Couldn't load deals" description={error.message} />
      ) : !deals?.length && !isLoading ? (
        <List.EmptyView
          icon={Icon.Megaphone}
          title={query ? `No deal for “${query}” yet` : "No deals found"}
          description="Request it and we'll email you when one lands."
          actions={<ActionPanel>{requestDeal}</ActionPanel>}
        />
      ) : (
        deals?.map((deal) => (
          <DealListItem key={deal.slug} deal={deal} showCategory={!category} requestDeal={requestDeal} />
        ))
      )}
    </List>
  );
}

function DealListItem({
  deal,
  showCategory,
  requestDeal,
}: {
  deal: Deal;
  showCategory: boolean;
  requestDeal: React.ReactNode;
}) {
  const accessories: List.Item.Accessory[] = [];
  if (deal.requires_application) accessories.push({ tag: "By application" });
  if (deal.category && showCategory) accessories.push({ text: deal.category.name });
  if (deal.value_usd != null) {
    accessories.push({
      tag: { value: formatValue(deal.value_usd), color: Color.Green },
      tooltip: "What the deal is worth",
    });
  }

  return (
    <List.Item
      title={deal.name}
      subtitle={deal.summary ?? undefined}
      icon={deal.logo_url ? { source: deal.logo_url, mask: Image.Mask.RoundedRectangle, fallback: Icon.Tag } : Icon.Tag}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.Push title="Show Details" icon={Icon.Sidebar} target={<DealDetailView deal={deal} />} />
          <Action.OpenInBrowser title="Get Deal on Build in Public" url={deal.deal_url} />
          <Action.CopyToClipboard
            title="Copy Deal Link"
            content={deal.deal_url}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          {requestDeal}
        </ActionPanel>
      }
    />
  );
}
