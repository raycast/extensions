import { Action, ActionPanel, Color, Icon, List, open } from "@raycast/api";
import { usePromise } from "@raycast/utils";

import {
  getAssets,
  money,
  moneyFull,
  label,
  WlthyError,
  baseUrl,
  type Asset,
} from "./lib/api";

/**
 * Assets — a searchable list of every holding, sorted by USD value. The
 * drill-down from Net Worth: "what do I actually hold?" Read-only; actions
 * only open the web app. Type is shown as a tag, value as the accessory.
 */

/** A rough glyph per asset class so the list scans fast. */
function typeIcon(type: string): Icon {
  switch (type) {
    case "real_estate":
      return Icon.House;
    case "cash":
      return Icon.BankNote;
    case "stock":
      return Icon.LineChart;
    case "crypto":
      return Icon.Coin;
    case "precious_metal":
      return Icon.Gauge;
    case "vehicle":
      return Icon.Car;
    case "private_equity":
      return Icon.Building;
    default:
      return Icon.Circle;
  }
}

export default function Assets() {
  const { data, isLoading, error, revalidate } = usePromise(getAssets);

  if (error) {
    const message =
      error instanceof WlthyError
        ? error.message
        : "Something went wrong reading your assets.";
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Couldn't load assets"
          description={message}
          actions={
            <ActionPanel>
              <Action
                title="Try Again"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
              />
              <Action.OpenInBrowser
                title="Open Settings"
                url={`${baseUrl()}/settings?tab=api`}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const rows: Asset[] = [...(data?.assets ?? [])].sort(
    (a, b) => b.value_usd - a.value_usd,
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search your holdings…">
      <List.Section title={data ? `${data.total} assets` : "Assets"}>
        {rows.map((a) => (
          <List.Item
            key={a.id}
            icon={{ source: typeIcon(a.type), tintColor: Color.Blue }}
            title={a.name}
            subtitle={a.quantity ? `${a.quantity} ×` : undefined}
            accessories={[
              { tag: { value: label(a.type), color: Color.SecondaryText } },
              a.valuation_status !== "ok"
                ? {
                    icon: {
                      source: Icon.ExclamationMark,
                      tintColor: Color.Orange,
                    },
                  }
                : {},
              { text: moneyFull(a.value_usd) },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Open Assets"
                  icon={Icon.Globe}
                  onAction={() => open(`${baseUrl()}/assets`)}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={revalidate}
                />
                <Action.CopyToClipboard
                  title="Copy Value"
                  content={money(a.value_usd)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
