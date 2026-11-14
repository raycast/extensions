import { Alert, Clipboard, confirmAlert, List, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { ComponentProps } from "react";
import { ReadyGame, useGame } from "./hooks/use-game";
import { abandonBounty, acceptBounty, rerollBoard } from "./engine/bounty";
import { CROP_BY_ID, ITEMS, SKILL_BY_ID } from "./engine/data";
import { drink, eat, equip, startTask, stopTask, unequip, build } from "./engine/engine";
import { spendPool } from "./engine/mastery";
import { exportSave, importClipboardSave } from "./engine/migrate";
import { buyPerk, launch, toggleMod } from "./engine/prestige";
import { replaceState } from "./engine/storage";
import { formatBundle, formatCredits, formatMarks } from "./engine/format";
import { harvest, harvestAll, plant } from "./engine/hydroponics";
import { buyFromShop } from "./engine/shop";
import { buy, sell, sellEverything, setKeep } from "./engine/trade";
import { SkillId } from "./engine/types";
import { Base } from "./views/base";
import { Bounties } from "./views/bounties";
import { Place } from "./views/constants";
import { Collection } from "./views/collection";
import { Equipment } from "./views/equipment";
import { Hydroponics } from "./views/hydroponics";
import { Inventory } from "./views/inventory";
import { BountyShop } from "./views/shop";
import { Settings } from "./views/settings";
import { Stats } from "./views/stats";
import { Survivor } from "./views/survivor";
import { Tasks } from "./views/tasks";
import { Trade } from "./views/trade";
import { Voyage } from "./views/voyage";

type Children = ComponentProps<typeof List>["children"];

// Each view below is given the game and wires its buttons to engine actions. The main menu reuses
// them for search results, and the pushed screens wrap them in a list of their own.

export const baseView = (g: ReadyGame) => (
  <Base state={g.state} frame={g.frame} onBuild={(id) => g.act((s) => build(s, id))} />
);

export const tasksView = (g: ReadyGame, skill: SkillId) => (
  <Tasks
    state={g.state}
    skill={skill}
    frame={g.frame}
    onStart={(id, runs) => g.act((s) => startTask(s, id, runs))}
    onStop={() => g.sync(stopTask)}
    onSpend={(id) => g.act((s) => spendPool(s, id))}
  />
);

export const hydroponicsView = (g: ReadyGame) => (
  <Hydroponics
    state={g.state}
    frame={g.frame}
    onPlant={(index, crop) =>
      g.act(
        (s) => plant(s, index, crop),
        () => `Planted ${CROP_BY_ID[crop].name}`,
      )
    }
    onHarvest={(index) =>
      g.act(
        (s) => harvest(s, index),
        (r) => `Harvested ${formatBundle(r.report?.items)}`,
      )
    }
    onHarvestAll={() =>
      g.act(
        (s) => harvestAll(s),
        (r) => `Harvested ${formatBundle(r.items)}`,
      )
    }
  />
);

export const inventoryView = (g: ReadyGame) => (
  <Inventory
    state={g.state}
    onEat={(id) => g.act((s) => eat(s, id))}
    onEquip={(id) =>
      g.act(
        (s) => equip(s, id),
        () => `Equipped ${ITEMS[id].name}`,
      )
    }
    onDrink={(id) =>
      g.act(
        (s) => drink(s, id),
        () => `Drank ${ITEMS[id].name}`,
      )
    }
    onSell={(id, qty) =>
      g.act(
        (s) => sell(s, id, qty),
        (r) => `Sold ${r.amount}× ${ITEMS[id].name} for ${formatCredits(r.credits ?? 0)}`,
      )
    }
    onSellEverything={() => sellEverythingConfirmed(g)}
    onKeep={(id, n) => g.sync((s) => setKeep(s, id, n))}
  />
);

async function sellEverythingConfirmed(g: ReadyGame) {
  const ok = await confirmAlert({
    title: "Sell everything?",
    message: "Sells all items you have not set aside with Keep, materials for crafting included.",
    primaryAction: { title: "Sell Everything", style: Alert.ActionStyle.Destructive },
  });
  if (!ok) return;
  await g.act(
    (s) => sellEverything(s),
    (r) => `Sold everything for ${formatCredits(r.credits ?? 0)}`,
  );
}

export async function copySave(g: ReadyGame) {
  await Clipboard.copy(exportSave(g.state));
  await showToast({ style: Toast.Style.Success, title: "Save copied to clipboard" });
}

export async function importSaveFromClipboard(g: ReadyGame) {
  const { state: imported, error } = importClipboardSave((await Clipboard.readText()) ?? "");
  if (!imported) {
    await showFailureToast(error ?? "Import failed", { title: "Import failed" });
    return;
  }
  const ok = await confirmAlert({
    title: "Replace your current game?",
    message: "The save on the clipboard overwrites your progress.",
    primaryAction: { title: "Import", style: Alert.ActionStyle.Destructive },
  });
  if (!ok) return;
  await replaceState(imported);
  await g.sync();
  await showToast({ style: Toast.Style.Success, title: "Save imported" });
}

async function launchShip(g: ReadyGame) {
  const ok = await confirmAlert({
    title: "Launch the Rescue Ship?",
    message:
      "This resets your skills, items and Base. Starlight, perks and lifetime stats stay. A copy of your save goes to the clipboard.",
    primaryAction: { title: "Launch", style: Alert.ActionStyle.Destructive },
  });
  if (!ok) return;
  await Clipboard.copy(exportSave(g.state));
  await g.act(launch, (r) => `Launched: +${r.gain} Starlight`);
  await showToast({ style: Toast.Style.Success, title: "A save copy is on your clipboard" });
}

const placeView: Record<Place, (g: ReadyGame) => Children> = {
  voyage: (g) => (
    <Voyage
      state={g.state}
      onLaunch={() => launchShip(g)}
      onBuy={(id) =>
        g.act(
          (s) => buyPerk(s, id),
          () => "Perk bought",
        )
      }
      onToggleMod={(id) => g.sync((s) => toggleMod(s, id).state)}
    />
  ),
  base: baseView,
  inventory: inventoryView,
  stats: (g) => <Stats state={g.state} />,
  collection: (g) => <Collection state={g.state} frame={g.frame} />,
  settings: (g) => (
    <Settings
      state={g.state}
      onChange={(change) => g.sync(change)}
      onExport={() => copySave(g)}
      onImport={() => importSaveFromClipboard(g)}
    />
  ),
  equipment: (g) => (
    <Equipment
      state={g.state}
      onEquip={(id) =>
        g.act(
          (s) => equip(s, id),
          () => `Equipped ${ITEMS[id].name}`,
        )
      }
      onUnequip={(slot) => g.sync((s) => unequip(s, slot))}
    />
  ),
  trade: (g) => (
    <Trade
      state={g.state}
      onSell={(id, qty) =>
        g.act(
          (s) => sell(s, id, qty),
          (r) => `Sold ${r.amount}× ${ITEMS[id].name} for ${formatCredits(r.credits ?? 0)}`,
        )
      }
      onBuy={(id, qty) =>
        g.act(
          (s) => buy(s, id, qty),
          (r) => `Bought ${r.amount ?? qty}× ${ITEMS[id].name} for ${formatCredits(r.cost ?? 0)}`,
        )
      }
    />
  ),
  bounties: (g) => (
    <Bounties
      state={g.state}
      onAccept={(id, start) =>
        g.act(
          (s) => {
            const accepted = acceptBounty(s, id);
            const target = s.board.offers.find((o) => o.id === id);
            return start && !accepted.error && target ? startTask(accepted.state, target.task) : accepted;
          },
          () => "Bounty accepted",
        )
      }
      onAbandon={() =>
        g.act(
          (s) => abandonBounty(s),
          () => "Bounty abandoned",
        )
      }
      onReroll={() =>
        g.act(
          (s) => rerollBoard(s),
          () => "The board has new bounties",
        )
      }
      onHunt={(taskId) => g.act((s) => startTask(s, taskId))}
    />
  ),
  shop: (g) => (
    <BountyShop
      state={g.state}
      onBuy={(id) =>
        g.act(
          (s) => buyFromShop(s, id),
          (r) => `Bought ${ITEMS[id].name} for ${formatMarks(r.cost ?? 0)}`,
        )
      }
    />
  ),
};

/** A pushed screen: the survivor on top, then whatever this screen is for. */
function Screen(props: { title: string; render: (g: ReadyGame) => Children }) {
  const game = useGame();
  if (!game.state) return <List isLoading navigationTitle={props.title} />;
  const ready = game as ReadyGame;
  return (
    <List isShowingDetail navigationTitle={props.title} filtering={{ keepSectionOrder: true }}>
      <Survivor state={ready.state} frame={ready.frame} onStop={() => ready.sync(stopTask)} />
      {props.render(ready)}
    </List>
  );
}

export const SkillScreen = (props: { skill: SkillId }) => (
  <Screen
    title={SKILL_BY_ID[props.skill].name}
    render={(g) => (props.skill === "hydroponics" ? hydroponicsView(g) : tasksView(g, props.skill))}
  />
);

export const PlaceScreen = (props: { place: Place }) => (
  <Screen title={props.place[0].toUpperCase() + props.place.slice(1)} render={placeView[props.place]} />
);
