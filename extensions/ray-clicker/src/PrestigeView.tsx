import { Action, ActionPanel, Icon, List, Color, showToast, Toast } from "@raycast/api";
import { useState, useMemo, useEffect } from "react";
import { formatNumber, calculatePrestigePoints } from "./utils";
import { GameState } from "./types";
import {
  PrestigeUpgrade,
  calculatePrestigeUpgradeCost,
  getAvailablePrestigeUpgrades,
  calculatePrestigeUpgradeEffect,
} from "./prestigeUpgrades";
import { PRESTIGE_PP_DIVISOR } from "./constants";

type PrestigeViewProps = {
  gameState: GameState;
  onPurchasePrestigeUpgrade: (id: string) => boolean;
  onPrestige: () => Promise<boolean>;
};

export function PrestigeView({ gameState, onPurchasePrestigeUpgrade, onPrestige }: PrestigeViewProps) {
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<PrestigeUpgrade["category"] | "all">("all");

  // Local reactive mirrors so the view updates immediately while mounted
  const [localPrestigeLevel, setLocalPrestigeLevel] = useState<number>(gameState.prestige.level);
  const [localPrestigePoints, setLocalPrestigePoints] = useState<number>(gameState.prestige.prestigePoints);
  const [localUpgrades, setLocalUpgrades] = useState<Record<string, number>>({
    ...gameState.prestige.upgrades,
  });

  // Keep local mirrors in sync with incoming game state updates
  useEffect(() => {
    setLocalPrestigeLevel(gameState.prestige.level);
  }, [gameState.prestige.level]);
  useEffect(() => {
    setLocalPrestigePoints(gameState.prestige.prestigePoints);
  }, [gameState.prestige.prestigePoints]);
  useEffect(() => {
    setLocalUpgrades({ ...gameState.prestige.upgrades });
  }, [gameState.prestige.upgrades]);
  const estimatedPrestigePoints = useMemo(() => {
    return calculatePrestigePoints(gameState.prestige.totalEarned || 0, PRESTIGE_PP_DIVISOR);
  }, [gameState.prestige.totalEarned]);

  // Get all upgrades and split into unlocked/locked per category
  const { unlockedByCategory, lockedByCategory } = useMemo(() => {
    const unlocked: { [key: string]: PrestigeUpgrade[] } = { production: [], efficiency: [], special: [] };
    const locked: { [key: string]: PrestigeUpgrade[] } = { production: [], efficiency: [], special: [] };

    const availableUpgrades = getAvailablePrestigeUpgrades(localPrestigeLevel);

    availableUpgrades.forEach((upgrade) => {
      const passesCategory = selectedCategory === "all" || upgrade.category === selectedCategory;
      const passesSearch =
        !searchText ||
        upgrade.name.toLowerCase().includes(searchText.toLowerCase()) ||
        upgrade.description.toLowerCase().includes(searchText.toLowerCase());
      if (!passesCategory || !passesSearch) return;

      if (upgrade.unlockLevel <= localPrestigeLevel) {
        unlocked[upgrade.category].push(upgrade);
      } else {
        locked[upgrade.category].push(upgrade);
      }
    });

    const sortFn = (a: PrestigeUpgrade, b: PrestigeUpgrade) => {
      if (a.unlockLevel !== b.unlockLevel) return a.unlockLevel - b.unlockLevel;
      return (
        calculatePrestigeUpgradeCost(a, localUpgrades[a.id] || 0) -
        calculatePrestigeUpgradeCost(b, localUpgrades[b.id] || 0)
      );
    };

    Object.values(unlocked).forEach((arr) => arr.sort(sortFn));
    Object.values(locked).forEach((arr) => arr.sort(sortFn));

    return { unlockedByCategory: unlocked, lockedByCategory: locked };
  }, [localPrestigeLevel, selectedCategory, searchText, localUpgrades]);

  // Check if there are any upgrades in the selected category
  const hasAnyUnlocked = useMemo(() => {
    return Object.values(unlockedByCategory).some((upgrades) => upgrades.length > 0);
  }, [unlockedByCategory]);
  const hasAnyLocked = useMemo(() => {
    return Object.values(lockedByCategory).some((upgrades) => upgrades.length > 0);
  }, [lockedByCategory]);

  // Handle purchase of a prestige upgrade
  const handlePurchase = (upgrade: PrestigeUpgrade) => {
    const currentLevel = localUpgrades[upgrade.id] || 0;
    if (currentLevel >= upgrade.maxLevel) return;
    if (upgrade.unlockLevel > localPrestigeLevel) {
      showToast({
        style: Toast.Style.Failure,
        title: "Locked",
        message: `Unlocks at Prestige ${upgrade.unlockLevel}`,
      });
      return;
    }

    const cost = calculatePrestigeUpgradeCost(upgrade, currentLevel);
    if (localPrestigePoints >= cost) {
      const ok = onPurchasePrestigeUpgrade(upgrade.id);
      if (!ok) {
        // Hook rejected due to race/affordability; rely on its toasts
        return;
      }
      // Update local mirrors immediately
      setLocalPrestigePoints((p) => p - cost);
      setLocalUpgrades((u) => ({ ...u, [upgrade.id]: currentLevel + 1 }));
      showToast({
        style: Toast.Style.Success,
        title: "Upgrade Purchased!",
        message: `${upgrade.name} upgraded to level ${currentLevel + 1}`,
      });
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: "Not enough prestige points!",
        message: `You need ${formatNumber(cost - localPrestigePoints)} more prestige points.`,
      });
    }
  };

  // Trigger prestige and update local mirrors immediately on success
  const handlePrestigeNow = async () => {
    const ok = await onPrestige();
    if (!ok) return;
    setLocalPrestigePoints((p) => p + estimatedPrestigePoints);
    setLocalPrestigeLevel((l) => l + 1);
  };

  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "production":
        return { source: Icon.Rocket, tintColor: Color.Green };
      case "efficiency":
        return { source: Icon.Gauge, tintColor: Color.Blue };
      case "special":
        return { source: Icon.Star, tintColor: Color.Yellow };
      default:
        return { source: Icon.QuestionMark };
    }
  };

  // Get category title
  const getCategoryTitle = (category: string) => {
    return category.charAt(0).toUpperCase() + category.slice(1) + " Upgrades";
  };

  // Effect descriptions are now handled directly in the JSX

  return (
    <List
      navigationTitle="Prestige Upgrades"
      searchBarPlaceholder="Search prestige upgrades..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Category"
          value={selectedCategory}
          onChange={(value) => setSelectedCategory(value as PrestigeUpgrade["category"] | "all")}
        >
          <List.Dropdown.Item title="All Categories" value="all" />
          <List.Dropdown.Item title="Production" value="production" />
          <List.Dropdown.Item title="Efficiency" value="efficiency" />
          <List.Dropdown.Item title="Special" value="special" />
        </List.Dropdown>
      }
    >
      <List.Section title="Prestige Information">
        <List.Item
          title={`Prestige Level: ${localPrestigeLevel}`}
          subtitle={`Prestige Points: ${formatNumber(localPrestigePoints)}`}
          icon={Icon.StarCircle}
        />
        <List.Item
          title="Estimated PP if Prestiged Now"
          subtitle={`${formatNumber(estimatedPrestigePoints)} PP`}
          icon={Icon.Stars}
          actions={
            <ActionPanel>
              <Action title="Prestige Now" onAction={handlePrestigeNow} icon={Icon.Star} />
            </ActionPanel>
          }
        />
      </List.Section>

      {!hasAnyUnlocked && !hasAnyLocked ? (
        <List.EmptyView
          icon={Icon.Star}
          title="No upgrades available"
          description={
            selectedCategory === "all"
              ? "Reach higher prestige levels to unlock more upgrades"
              : `No ${selectedCategory} upgrades available`
          }
        />
      ) : (
        <>
          {Object.entries(unlockedByCategory).map(([category, upgrades]) => {
            if (upgrades.length === 0) return null;
            return (
              <List.Section key={`unlocked-${category}`} title={`${getCategoryTitle(category)} (Unlocked)`}>
                {upgrades.map((upgrade) => {
                  const currentLevel = localUpgrades[upgrade.id] || 0;
                  const nextLevel = currentLevel + 1;
                  const maxed = currentLevel >= upgrade.maxLevel;
                  const cost = calculatePrestigeUpgradeCost(upgrade, currentLevel);
                  const canAfford = localPrestigePoints >= cost;
                  const effect = calculatePrestigeUpgradeEffect(upgrade, nextLevel);

                  const effectLabel =
                    upgrade.effectDisplay === "additive"
                      ? `+${formatNumber(effect)}`
                      : upgrade.effectDisplay === "multiplicative"
                        ? `x${formatNumber(effect)}`
                        : undefined;

                  const accessories: List.Item.Accessory[] = [
                    {
                      text: maxed
                        ? `MAX (${currentLevel}/${upgrade.maxLevel})`
                        : `Lvl ${currentLevel} → ${nextLevel} | ${formatNumber(cost)} PP`,
                      icon: maxed
                        ? { source: Icon.Checkmark, tintColor: Color.Green }
                        : canAfford
                          ? { source: Icon.Star, tintColor: Color.Yellow }
                          : { source: Icon.XmarkCircle, tintColor: Color.Red },
                    },
                  ];
                  if (effectLabel) {
                    accessories.push({ text: effectLabel, tooltip: "Effect at next level" });
                  }

                  return (
                    <List.Item
                      key={upgrade.id}
                      title={`${upgrade.icon} ${upgrade.name}`}
                      subtitle={upgrade.description}
                      accessories={accessories}
                      icon={getCategoryIcon(upgrade.category)}
                      actions={
                        <ActionPanel>
                          {!maxed && canAfford && (
                            <Action
                              title={"Purchase Upgrade"}
                              onAction={() => handlePurchase(upgrade)}
                              icon={Icon.Star}
                              shortcut={{ modifiers: ["cmd"], key: "e" }}
                            />
                          )}
                        </ActionPanel>
                      }
                    />
                  );
                })}
              </List.Section>
            );
          })}

          {hasAnyLocked &&
            Object.entries(lockedByCategory).map(([category, upgrades]) => {
              if (upgrades.length === 0) return null;
              return (
                <List.Section key={`locked-${category}`} title={`${getCategoryTitle(category)} (Locked)`}>
                  {upgrades.map((upgrade) => {
                    const currentLevel = localUpgrades[upgrade.id] || 0;
                    const cost = calculatePrestigeUpgradeCost(upgrade, currentLevel);
                    return (
                      <List.Item
                        key={`locked-${upgrade.id}`}
                        title={`${upgrade.icon} ${upgrade.name}`}
                        subtitle={upgrade.description}
                        accessories={[
                          { text: `Unlocks at Prestige ${upgrade.unlockLevel}` },
                          { text: `${formatNumber(cost)} PP`, icon: Icon.Coins },
                        ]}
                        icon={getCategoryIcon(upgrade.category)}
                      />
                    );
                  })}
                </List.Section>
              );
            })}
        </>
      )}
    </List>
  );
}
