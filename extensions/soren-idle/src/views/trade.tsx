import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { ITEMS, LOCALS } from "../engine/data";
import { firstContact } from "../engine/engine";
import { formatCredits } from "../engine/format";
import {
  buyDiscount,
  buyPrice,
  canTrade,
  greeting,
  hubLevel,
  sellableCount,
  sellPrice,
  sellRate,
  stockFor,
  translatorLevel,
} from "../engine/trade";
import { GameState, ItemId } from "../engine/types";
import { Notice } from "./notice";

const MAX_TRANSLATOR_LEVEL = 5;

export function Trade(props: {
  state: GameState;
  onSell: (id: ItemId, qty: number | "all") => void;
  onBuy: (id: ItemId, qty: number) => void;
}) {
  const { state } = props;

  if (!canTrade(state)) {
    return (
      <Notice
        icon={Icon.Coins}
        title="No Trading Hub"
        description={
          firstContact(state)
            ? `${LOCALS} are here. Build a Trading Hub in Base to trade with them.`
            : "There is nobody to trade with yet. Build a Signal Beacon in Base."
        }
      />
    );
  }

  const talk = `> ${greeting(state)}`;
  const sellable = (Object.keys(ITEMS) as ItemId[]).filter((id) => sellableCount(state, id) > 0);
  const stock = stockFor(state);
  const discount = buyDiscount(state);

  return (
    <>
      <List.Section
        title="Sell"
        subtitle={`Hub level ${hubLevel(state)}: ${Math.round(sellRate(state) * 100)}% of worth`}
      >
        {sellable.map((id) => {
          const item = ITEMS[id];
          const have = sellableCount(state, id);
          return (
            <List.Item
              key={`sell-${id}`}
              title={item.name}
              icon={Icon.Coins}
              accessories={[
                { text: `×${have}` },
                { tag: { value: formatCredits(sellPrice(state, id)), color: Color.Green } },
              ]}
              detail={
                <List.Item.Detail
                  markdown={[
                    talk,
                    "",
                    `# ${item.name}`,
                    item.description,
                    "",
                    `- **Pays:** ${formatCredits(sellPrice(state, id))} each`,
                    `- **All ${have}:** ${formatCredits(have * sellPrice(state, id))}`,
                  ].join("\n")}
                />
              }
              actions={
                <ActionPanel>
                  <Action title="Sell 1" icon={Icon.Coins} onAction={() => props.onSell(id, 1)} />
                  <Action
                    title="Sell 10"
                    icon={Icon.Coins}
                    shortcut={{
                      macOS: { modifiers: ["cmd"], key: "1" },
                      Windows: { modifiers: ["ctrl"], key: "1" },
                    }}
                    onAction={() => props.onSell(id, 10)}
                  />
                  <Action
                    title="Sell All"
                    icon={Icon.Coins}
                    shortcut={{
                      macOS: { modifiers: ["cmd", "shift"], key: "a" },
                      Windows: { modifiers: ["ctrl", "shift"], key: "a" },
                    }}
                    onAction={() => props.onSell(id, "all")}
                  />
                </ActionPanel>
              }
            />
          );
        })}
        {sellable.length === 0 && (
          <List.Item
            title="Nothing to sell"
            icon={Icon.Box}
            detail={<List.Item.Detail markdown={`${talk}\n\nGo gather something first.`} />}
          />
        )}
      </List.Section>
      <List.Section
        title="Buy"
        subtitle={discount > 0 ? `${Math.round(discount * 100)}% off` : "Prices are high"}
      >
        {stock.map((entry) => {
          const item = ITEMS[entry.item];
          const price = buyPrice(state, entry);
          const canAfford = state.credits >= price;
          return (
            <List.Item
              key={`buy-${entry.item}`}
              title={item.name}
              icon={Icon.Cart}
              accessories={[
                {
                  tag: {
                    value: formatCredits(price),
                    color: canAfford ? Color.Orange : Color.SecondaryText,
                  },
                },
              ]}
              detail={
                <List.Item.Detail
                  markdown={[
                    talk,
                    "",
                    `# ${item.name}`,
                    item.description,
                    "",
                    `- **Price:** ${formatCredits(price)}${discount > 0 ? ` (${Math.round(discount * 100)}% off)` : ""}`,
                    `- **You have:** ${formatCredits(state.credits)}`,
                  ].join("\n")}
                />
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Buy 1"
                    icon={Icon.Cart}
                    onAction={() => props.onBuy(entry.item, 1)}
                  />
                  <Action
                    title="Buy 5"
                    icon={Icon.Cart}
                    shortcut={{
                      macOS: { modifiers: ["cmd"], key: "1" },
                      Windows: { modifiers: ["ctrl"], key: "1" },
                    }}
                    onAction={() => props.onBuy(entry.item, 5)}
                  />
                  <Action
                    title="Buy Max"
                    icon={Icon.Cart}
                    shortcut={{
                      macOS: { modifiers: ["cmd", "shift"], key: "m" },
                      Windows: { modifiers: ["ctrl", "shift"], key: "m" },
                    }}
                    onAction={() =>
                      props.onBuy(entry.item, Math.max(1, Math.floor(state.credits / price)))
                    }
                  />
                </ActionPanel>
              }
            />
          );
        })}
        {translatorLevel(state) < MAX_TRANSLATOR_LEVEL && (
          <List.Item
            title="More goods on offer later"
            subtitle={`Translation Device level ${translatorLevel(state) + 1}`}
            icon={{ source: Icon.Lock, tintColor: Color.SecondaryText }}
            detail={
              <List.Item.Detail
                markdown={`${talk}\n\nThey have more to show you once you can understand them better. Upgrade the Translation Device in Base.`}
              />
            }
          />
        )}
      </List.Section>
    </>
  );
}
