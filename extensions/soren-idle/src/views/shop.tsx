import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { BUILDING_BY_ID, BOUNTY_SHOP, ITEMS } from "../engine/data";
import { bountyLevel } from "../engine/bounty";
import { count } from "../engine/engine";
import { formatMarks } from "../engine/format";
import { shopOpen, shopStatus } from "../engine/shop";
import { GameState, ItemId } from "../engine/types";
import { Notice } from "./notice";

export function BountyShop(props: { state: GameState; onBuy: (id: ItemId) => void }) {
  const { state } = props;

  if (!shopOpen(state)) {
    return (
      <Notice
        icon={Icon.Cart}
        title="No Bounty Board"
        description={`The shop opens with the ${BUILDING_BY_ID.bounty_board.name}. Build it in Base.`}
      />
    );
  }

  return (
    <List.Section
      title="Bounty Shop"
      subtitle={`Bounty level ${bountyLevel(state)} · ${formatMarks(state.marks)}`}
    >
      {BOUNTY_SHOP.map((entry) => {
        const item = ITEMS[entry.item];
        const status = shopStatus(state, entry);
        const locked = status === "locked";
        const levelOk = bountyLevel(state) >= entry.levelReq;
        const marksOk = state.marks >= entry.cost;
        return (
          <List.Item
            key={entry.item}
            title={item.name}
            icon={locked ? { source: Icon.Lock, tintColor: Color.SecondaryText } : Icon.Cart}
            accessories={[
              ...(locked ? [{ tag: `Bounty ${entry.levelReq}` }] : []),
              ...(status === "owned" ? [{ tag: { value: "Owned", color: Color.Green } }] : []),
              ...(count(state, entry.item) > 0 && status !== "owned"
                ? [{ text: `×${count(state, entry.item)}` }]
                : []),
              {
                tag: {
                  value: formatMarks(entry.cost),
                  color: status === "ready" ? Color.Orange : Color.SecondaryText,
                },
              },
            ]}
            detail={
              <List.Item.Detail
                markdown={[
                  `# ${item.name}`,
                  item.description,
                  "",
                  "_You cannot craft this or buy it from the Hub._",
                  "",
                  `- ${levelOk ? "✅" : "❌"} Bounty level ${entry.levelReq} (you are ${bountyLevel(state)})`,
                  `- ${marksOk ? "✅" : "❌"} ${formatMarks(entry.cost)} (you have ${Math.floor(state.marks)})`,
                ].join("\n")}
              />
            }
            actions={
              <ActionPanel>
                {status !== "owned" && (
                  <Action title="Buy" icon={Icon.Cart} onAction={() => props.onBuy(entry.item)} />
                )}
              </ActionPanel>
            }
          />
        );
      })}
    </List.Section>
  );
}
