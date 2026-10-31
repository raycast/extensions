import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { ITEMS } from "../engine/data";
import { storageCap, count, isEquipped, isGear } from "../engine/engine";
import { describeItem, formatCredits } from "../engine/format";
import { canTrade, keepCount, sellPrice, sellableCount } from "../engine/trade";
import { gearStats } from "./equipment";
import { GameState, ItemId } from "../engine/types";
import { Notice } from "./notice";

const KEEP_CHOICES = [0, 10, 25, 50, 100];

export function Inventory(props: {
  state: GameState;
  onEat: (id: ItemId) => void;
  onDrink: (id: ItemId) => void;
  onEquip: (id: ItemId) => void;
  onSell: (id: ItemId, qty: number | "all") => void;
  onSellEverything: () => void;
  onKeep: (id: ItemId, n: number) => void;
}) {
  const { state } = props;
  const owned = (Object.keys(ITEMS) as ItemId[]).filter((id) => count(state, id) > 0);
  if (!owned.length) {
    return <Notice title="Nothing yet" description="Salvage something from the wreck." icon={Icon.Box} />;
  }
  return (
    <List.Section title="Inventory" subtitle={`Each item holds up to ${storageCap(state).toLocaleString("en-US")}`}>
      {owned.map((id) => {
        const item = ITEMS[id];
        const keep = keepCount(state, id);
        const sellable = sellableCount(state, id);
        return (
          <List.Item
            key={id}
            title={item.name}
            keywords={[
              ...(item.heal ? ["food", "eat"] : []),
              ...(item.potion ? ["potion", "drink", item.potion.kind] : []),
              ...(item.slot ? ["gear", "equipment", item.slot] : []),
            ]}
            icon={Icon.Box}
            accessories={[
              ...(isEquipped(state, id) ? [{ tag: { value: "Equipped", color: Color.Green } }] : []),
              ...(keep > 0 && !isGear(id) ? [{ tag: `Keep ${keep}` }] : []),
              {
                text: `×${Math.floor(count(state, id))}`,
                tooltip: isGear(id) ? undefined : `Holds up to ${storageCap(state).toLocaleString("en-US")}`,
              },
            ]}
            detail={
              <List.Item.Detail
                markdown={`# ${item.name}\n${describeItem(item)}${item.slot ? `\n\n**${gearStats(id)}**` : ""}${item.unsellable ? "\n\n_The locals will not buy this._" : `\n\nWorth **${formatCredits(sellPrice(state, id))}** each.`}`}
              />
            }
            actions={
              <ActionPanel>
                {item.heal && (
                  <Action title={`Eat (+${item.heal} HP)`} icon={Icon.Heart} onAction={() => props.onEat(id)} />
                )}
                {item.slot && !isEquipped(state, id) && (
                  <Action title="Equip" icon={Icon.Check} onAction={() => props.onEquip(id)} />
                )}
                {item.potion && <Action title="Drink" icon={Icon.Pill} onAction={() => props.onDrink(id)} />}
                {canTrade(state) && sellable > 0 && (
                  <>
                    <Action title="Sell 1" icon={Icon.Coins} onAction={() => props.onSell(id, 1)} />
                    <Action
                      title={`Sell All (${sellable})`}
                      icon={Icon.Coins}
                      shortcut={{
                        macOS: { modifiers: ["cmd", "shift"], key: "a" },
                        Windows: { modifiers: ["ctrl", "shift"], key: "a" },
                      }}
                      onAction={() => props.onSell(id, "all")}
                    />
                  </>
                )}
                <ActionPanel.Submenu title="Keep When Selling" icon={Icon.Lock}>
                  {KEEP_CHOICES.map((n) => (
                    <Action
                      key={n}
                      title={n === 0 ? "Keep None" : `Keep ${n}`}
                      icon={(state.keep[id] ?? 0) === n ? Icon.CheckCircle : Icon.Circle}
                      onAction={() => props.onKeep(id, n)}
                    />
                  ))}
                </ActionPanel.Submenu>
                {canTrade(state) && (
                  <Action
                    title="Sell Everything"
                    icon={Icon.Coins}
                    style={Action.Style.Destructive}
                    onAction={props.onSellEverything}
                  />
                )}
              </ActionPanel>
            }
          />
        );
      })}
    </List.Section>
  );
}

// --- base -------------------------------------------------------------------
