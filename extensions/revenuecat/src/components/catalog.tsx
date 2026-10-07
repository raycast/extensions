import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { ProjectDropdown } from "./projects";
import { useState } from "react";
import { ExplorerClient, Offering, Product } from "../lib/explorer-api";
import { demoOfferings, demoPage, demoProducts } from "../lib/demo";
import { usePaged } from "../hooks/data";
import { CommonActions, Context, Empty, More, readable, statusColor } from "./common";
interface Entry {
  id: string;
  product?: Product;
  offering?: Offering;
}
export function Catalog({ context }: { context: Context }) {
  const [tab, setTab] = useState("products");
  const client = new ExplorerClient(context.apiKey);
  const state = usePaged<Entry>(`${context.project.id}:catalog:${tab}`, async (next, signal) => {
    if (tab === "products") {
      const page = await (context.demo ? demoPage(demoProducts) : client.products(context.project.id, next, signal));
      return { ...page, items: page.items.map((product) => ({ id: product.id, product })) };
    }
    const page = await (context.demo ? demoPage(demoOfferings) : client.offerings(context.project.id, next, signal));
    return { ...page, items: page.items.map((offering) => ({ id: offering.id, offering })) };
  });
  const catalogFilter = (
    <ActionPanel.Submenu title="Show Catalog" icon={Icon.Filter} shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}>
      <Action
        title="Products"
        icon={tab === "products" ? Icon.Checkmark : Icon.Box}
        onAction={() => setTab("products")}
      />
      <Action
        title="Offerings"
        icon={tab === "offerings" ? Icon.Checkmark : Icon.Layers}
        onAction={() => setTab("offerings")}
      />
    </ActionPanel.Submenu>
  );
  return (
    <List
      navigationTitle={tab === "products" ? "Products" : "Offerings"}
      isLoading={state.loading}
      isShowingDetail
      searchBarPlaceholder={`Filter ${tab}…`}
      searchBarAccessory={<ProjectDropdown context={context} command="catalog" />}
    >
      <Empty
        loading={state.loading}
        error={state.error}
        title={`No ${tab} found`}
        refresh={state.refresh}
        actions={catalogFilter}
      />
      <List.Section title={readable(tab)}>
        {state.items.map(({ id, product, offering }) => {
          const title = product ? product.display_name || product.store_identifier : offering!.display_name;
          const identifier = product ? product.store_identifier : offering!.lookup_key;
          const itemState = product?.state || offering?.state;
          const price = product?.indicative_price;
          const formattedPrice =
            price && Number.isFinite(price.amount_micros)
              ? new Intl.NumberFormat(undefined, { style: "currency", currency: price.currency }).format(
                  price.amount_micros / 1e6,
                )
              : undefined;
          return (
            <List.Item
              key={id}
              title={title}
              icon={{ source: product ? Icon.Box : Icon.Layers, tintColor: product ? Color.Blue : Color.Purple }}
              accessories={
                offering?.is_current
                  ? [{ tag: { value: "Current", color: Color.Green } }]
                  : itemState
                    ? [{ tag: { value: readable(itemState), color: statusColor(itemState) } }]
                    : []
              }
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Name" text={title} />
                      {itemState && (
                        <List.Item.Detail.Metadata.TagList title="Status">
                          <List.Item.Detail.Metadata.TagList.Item
                            text={readable(itemState)}
                            color={statusColor(itemState)}
                          />
                        </List.Item.Detail.Metadata.TagList>
                      )}
                      <List.Item.Detail.Metadata.Label title="Identifier" text={identifier} />
                      <List.Item.Detail.Metadata.Label title="ID" text={id} />
                      <List.Item.Detail.Metadata.Separator />
                      {product && (
                        <>
                          <List.Item.Detail.Metadata.Label title="Type" text={readable(product.type)} />
                          <List.Item.Detail.Metadata.Label
                            title="Duration"
                            text={product.subscription?.duration || "Not applicable"}
                          />
                          <List.Item.Detail.Metadata.Label
                            title="Trial"
                            text={product.subscription?.trial_duration || "Not provided"}
                          />
                          <List.Item.Detail.Metadata.Label title="App ID" text={product.app_id} />
                          {formattedPrice && (
                            <List.Item.Detail.Metadata.Label
                              title="Indicative US Price"
                              text={`${formattedPrice} ${price!.currency}`}
                            />
                          )}
                        </>
                      )}
                      {offering && (
                        <>
                          <List.Item.Detail.Metadata.Label
                            title="Current Offering"
                            text={offering.is_current ? "Yes" : "No"}
                          />
                          <List.Item.Detail.Metadata.Label
                            title="Paywall"
                            text={offering.paywall_id || "No paywall returned"}
                          />
                        </>
                      )}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy Identifier" content={identifier} />
                  <Action.CopyToClipboard title="Copy RevenueCat ID" content={id} />
                  {catalogFilter}
                  <CommonActions refresh={state.refresh} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      {state.items.length > 0 && <More {...state} />}
    </List>
  );
}
