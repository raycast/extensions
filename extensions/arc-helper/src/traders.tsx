import { ActionPanel, Action, List, Detail, Icon, Color } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { Fragment, useEffect, useMemo, useState } from "react";
import { API, BarterItem, BarterOffer, BarterService, ItemRef, MetaForgeUrl, TradersResponse } from "./api";
import { formatDuration, formatNumber, itemTable, section } from "./format";
import { ItemDetail, ViewItemsSubmenu } from "./item-detail";
import { RefreshAction, itemIcon, loadFailure, rarityAccessory } from "./ui";

const ERMAL = "Ermal";

type OfferStatus = "active" | "upcoming" | "expired";

const STATUS_LABEL: Record<OfferStatus, { text: string; color: Color }> = {
  active: { text: "Active", color: Color.Green },
  upcoming: { text: "Upcoming", color: Color.Yellow },
  expired: { text: "Expired", color: Color.SecondaryText },
};

function offerStatus(offer: BarterOffer, now: number): OfferStatus {
  if (now < Date.parse(offer.offer_start)) return "upcoming";
  if (now >= Date.parse(offer.offer_end)) return "expired";
  return "active";
}

function offerTiming(offer: BarterOffer, now: number): string {
  const status = offerStatus(offer, now);
  if (status === "expired") return "Expired";
  const target = status === "active" ? Date.parse(offer.offer_end) : Date.parse(offer.offer_start);
  const remaining = formatDuration(Math.max(1, Math.round((target - now) / 60000)));
  return status === "active" ? `Ends in ${remaining}` : `Starts in ${remaining}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** Category entries such as "Any Firearm" are not real items and cannot be opened. */
function realItems(items: BarterItem[]): ItemRef[] {
  return items.filter((item) => !item.is_category);
}

function acceptedItemsTable(items: BarterItem[]): string {
  return itemTable(items.map((item) => ({ item, quantity: item.amount ?? 1 })));
}

function costText(coinCost: number): string {
  return coinCost > 0 ? `${formatNumber(coinCost)} coins` : "No coin cost";
}

function OfferDetail({ offer }: { offer: BarterOffer }) {
  const now = Date.now();
  const status = STATUS_LABEL[offerStatus(offer, now)];
  const markdown = [
    `# ${offer.offer_title}`,
    offer.item?.icon ? `![${offer.offer_title}](${offer.item.icon})` : "",
    offer.item?.description ?? "",
    `**Coin cost:** ${costText(offer.coin_cost)}`,
    section("Accepted Items", acceptedItemsTable(offer.accepted_items)),
  ]
    .filter(Boolean)
    .join("\n\n");

  return (
    <Detail
      navigationTitle={offer.offer_title}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Trader" text={ERMAL} icon={Icon.Person} />
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item text={status.text} color={status.color} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Timing" text={offerTiming(offer, now)} icon={Icon.Clock} />
          <Detail.Metadata.Label title="Coin Cost" text={costText(offer.coin_cost)} icon={Icon.Coins} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Available From" text={formatDate(offer.offer_start)} />
          <Detail.Metadata.Label title="Available Until" text={formatDate(offer.offer_end)} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {offer.item && <Action.OpenInBrowser url={MetaForgeUrl.item(offer.item.id)} />}
          <ViewItemsSubmenu items={[...(offer.item ? [offer.item] : []), ...realItems(offer.accepted_items)]} />
          <Action.CopyToClipboard title="Copy Offer Name" content={offer.offer_title} />
        </ActionPanel>
      }
    />
  );
}

function ServiceDetail({ service }: { service: BarterService }) {
  const markdown = [
    `# ${service.name}`,
    service.description,
    `**Coin cost:** ${costText(service.coin_cost)}`,
    section("Accepted Items", acceptedItemsTable(service.accepted_items)),
  ].join("\n\n");

  return (
    <Detail
      navigationTitle={service.name}
      markdown={markdown}
      actions={
        <ActionPanel>
          <ViewItemsSubmenu items={realItems(service.accepted_items)} />
          <Action.CopyToClipboard title="Copy Service Name" content={service.name} />
        </ActionPanel>
      }
    />
  );
}

function includesText(search: string, ...values: (string | null | undefined)[]): boolean {
  if (!search) return true;
  const needle = search.toLowerCase();
  return values.some((value) => value?.toLowerCase().includes(needle));
}

export default function Traders() {
  const [searchText, setSearchText] = useState("");
  const [traderFilter, setTraderFilter] = useState<string>("all");

  const { isLoading, data, revalidate } = useFetch<TradersResponse>(API.traders, {
    keepPreviousData: true,
    failureToastOptions: loadFailure("traders"),
  });

  const inventories = data?.data ?? {};
  const ermal = data?.ermal;
  const traderNames = [...Object.keys(inventories), ...(ermal ? [ERMAL] : [])].sort((a, b) => a.localeCompare(b));
  const shownTraders = traderFilter === "all" ? traderNames : traderNames.filter((name) => name === traderFilter);

  // Tick every minute so offer countdowns and active/expired status stay current while the list is open.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const offers = useMemo(() => {
    const order: Record<OfferStatus, number> = { active: 0, upcoming: 1, expired: 2 };
    return (ermal?.offers ?? [])
      .filter((offer) => includesText(searchText, offer.offer_title, ...offer.accepted_items.map((item) => item.name)))
      .map((offer) => ({ offer, status: offerStatus(offer, now), timing: offerTiming(offer, now) }))
      .sort((a, b) => order[a.status] - order[b.status] || a.offer.offer_title.localeCompare(b.offer.offer_title));
  }, [ermal, searchText, now]);

  const services = (ermal?.permanent_services ?? []).filter((service) =>
    includesText(searchText, service.name, service.description),
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search trader items and offers..."
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Trader" value={traderFilter} onChange={setTraderFilter}>
          <List.Dropdown.Item title="All Traders" value="all" />
          <List.Dropdown.Section title="Traders">
            {traderNames.map((trader) => (
              <List.Dropdown.Item key={trader} title={trader} value={trader} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {shownTraders.map((trader) => {
        if (trader === ERMAL) {
          return (
            <Fragment key={ERMAL}>
              {offers.length > 0 && (
                <List.Section key="ermal-offers" title="Ermal · Barter Offers" subtitle={`${offers.length} offers`}>
                  {offers.map(({ offer, status, timing }) => (
                    <List.Item
                      key={offer.id}
                      icon={itemIcon(offer.item?.icon, Icon.Switch)}
                      title={offer.offer_title}
                      subtitle={`${offer.accepted_items.length} accepted item(s)`}
                      accessories={[
                        ...(offer.coin_cost > 0 ? [{ icon: Icon.Coins, text: formatNumber(offer.coin_cost) }] : []),
                        { tag: { value: timing, color: STATUS_LABEL[status].color } },
                      ]}
                      actions={
                        <ActionPanel>
                          <Action.Push title="View Offer" icon={Icon.Eye} target={<OfferDetail offer={offer} />} />
                          <ViewItemsSubmenu
                            items={[...(offer.item ? [offer.item] : []), ...realItems(offer.accepted_items)]}
                          />
                          <RefreshAction onRefresh={revalidate} />
                        </ActionPanel>
                      }
                    />
                  ))}
                </List.Section>
              )}
              {services.length > 0 && (
                <List.Section key="ermal-services" title="Ermal · Services">
                  {services.map((service) => (
                    <List.Item
                      key={service.id}
                      icon={Icon.Hammer}
                      title={service.name}
                      subtitle={service.description}
                      accessories={[{ icon: Icon.Coins, text: formatNumber(service.coin_cost) }]}
                      actions={
                        <ActionPanel>
                          <Action.Push
                            title="View Service"
                            icon={Icon.Eye}
                            target={<ServiceDetail service={service} />}
                          />
                          <RefreshAction onRefresh={revalidate} />
                        </ActionPanel>
                      }
                    />
                  ))}
                </List.Section>
              )}
            </Fragment>
          );
        }

        const items = (inventories[trader] ?? []).filter((item) =>
          includesText(searchText, item.name, item.description, item.item_type),
        );
        if (items.length === 0 && searchText !== "") return null;

        return (
          <List.Section key={trader} title={trader} subtitle={`${items.length} items`}>
            {items.map((item) => (
              <List.Item
                key={`${trader}-${item.id}`}
                icon={itemIcon(item.icon)}
                title={item.name}
                subtitle={item.item_type}
                accessories={[
                  ...rarityAccessory(item.rarity),
                  { icon: Icon.Coins, text: formatNumber(item.trader_price) },
                ]}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="View Details"
                      icon={Icon.Eye}
                      target={
                        <ItemDetail
                          id={item.id}
                          preview={item}
                          extraMetadata={
                            <>
                              <Detail.Metadata.Label title="Trader" text={trader} icon={Icon.Person} />
                              <Detail.Metadata.Label
                                title="Trader Price"
                                text={formatNumber(item.trader_price)}
                                icon={Icon.Coins}
                              />
                              <Detail.Metadata.Separator />
                            </>
                          }
                        />
                      }
                    />
                    <Action.OpenInBrowser url={MetaForgeUrl.item(item.id)} />
                    <Action.CopyToClipboard title="Copy Item Name" content={item.name} />
                    <RefreshAction onRefresh={revalidate} />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}
