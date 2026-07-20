import { Icon, List, useNavigation, showToast, Toast, confirmAlert, Action, ActionPanel } from "@raycast/api";
import { useState, useRef, useCallback } from "react";
import { GameView } from "./GameView";
import { PrestigeView } from "./PrestigeView";
import { useGameState } from "./useGameState";
import { UPGRADES, UPGRADE_CATEGORIES } from "./types";
import { ACHIEVEMENTS, type AchievementId, achievementWhy } from "./achievements";
import { formatNumber, calculatePrestigePoints } from "./utils";
import { PRESTIGE_PP_DIVISOR } from "./constants";

// --- Main Clicker Game View ---
export default function Command() {
  const { push } = useNavigation();
  const {
    gameState,
    click,
    purchaseUpgrade,
    purchaseUpgradeMax,
    purchasePrestigeUpgrade,
    reset,
    prestige,
    isLoading,
    toggleLuckyToasts,
  } = useGameState();

  // We track search text changes but don't need to use the value directly
  // as it's passed to the GameView component
  const [, setSearchText] = useState("");
  const comboCountRef = useRef(0);
  const [comboMultiplier, setComboMultiplier] = useState(1);
  const comboTimeout = useRef<NodeJS.Timeout | null>(null);

  // Handle click with combo logic
  const handleClick = useCallback(() => {
    // Compute next combo and multiplier first so it applies to this click
    const next = comboCountRef.current + 1;
    const newMultiplier = Math.min(3, 1 + Math.floor(next / 10));

    // Apply the click with the current multiplier
    click(newMultiplier);

    // Update combo state
    comboCountRef.current = next;
    setComboMultiplier(newMultiplier);

    // Reset combo after delay
    if (comboTimeout.current) clearTimeout(comboTimeout.current);
    comboTimeout.current = setTimeout(() => {
      comboCountRef.current = 0;
      setComboMultiplier(1);
    }, 3000);
  }, [click]);

  // Handle upgrade purchase
  const handleUpgrade = useCallback(
    (id: string) => {
      const upgrade = UPGRADES[id as keyof typeof UPGRADES];
      if (!upgrade) return;

      const success = purchaseUpgrade(id);
      if (success) {
        const currentLevel = gameState.upgrades[id] || 0;
        showToast({
          style: Toast.Style.Success,
          title: `${upgrade.name} Upgraded!`,
          message: `Your ${upgrade.name.toLowerCase()} is now level ${currentLevel + 1}`,
        });
      }
    },
    [purchaseUpgrade, gameState.upgrades],
  );

  // Handle buy max
  const handleUpgradeMax = useCallback(
    (id: string) => {
      const upgrade = UPGRADES[id as keyof typeof UPGRADES];
      if (!upgrade) return;

      const bought = purchaseUpgradeMax(id);
      if (bought > 0) {
        showToast({
          style: Toast.Style.Success,
          title: `Bought ${bought} level${bought === 1 ? "" : "s"} of ${upgrade.name}`,
        });
      } else {
        showToast({ style: Toast.Style.Failure, title: `Can't Afford`, message: `Not enough currency` });
      }
    },
    [purchaseUpgradeMax],
  );

  // Handle prestige upgrade purchase
  const handlePrestigeUpgrade = useCallback(
    (id: string) => {
      return purchasePrestigeUpgrade(id);
    },
    [purchasePrestigeUpgrade],
  );

  // Handle showing stats
  const handleShowStats = useCallback(() => {
    // --- Base Stats ---
    const stats = [
      { title: "Current Points", value: formatNumber(gameState.currency), icon: Icon.Coins },
      { title: "Total Points Earned", value: formatNumber(gameState.prestige.totalEarned), icon: Icon.Coin },
      { title: "Points Per Second", value: formatNumber(gameState.idleRate), icon: Icon.Gauge },
      { title: "Click Value", value: formatNumber(gameState.clickValue), icon: Icon.Dot },
      { title: "Prestige Level", value: gameState.prestige.level.toString(), icon: Icon.Star },
      { title: "Prestige Points", value: formatNumber(gameState.prestige.prestigePoints), icon: Icon.Star },
      { title: "Multiplier", value: `x${(1 + gameState.prestige.level * 0.1).toFixed(2)}`, icon: Icon.ArrowUpCircle },
    ];

    // Lucky + Frugal
    const luckyLevel = gameState.upgrades["luckyCommands"] || 0;
    const luckyChance = luckyLevel > 0 ? 0.01 + Math.max(0, luckyLevel - 1) * 0.0001 : 0;
    const frugalLevel = gameState.prestige.upgrades["frugalShopper"] || 0;
    const frugalFactor = Math.max(0.01, 1 - 0.02 * frugalLevel);
    const frugalDiscountPct = (1 - frugalFactor) * 100;
    stats.push({ title: "Lucky Chance", value: `${(luckyChance * 100).toFixed(2)}%`, icon: Icon.Stars });
    stats.push({ title: "Frugal Discount", value: `${frugalDiscountPct.toFixed(2)}% off`, icon: Icon.Tag });

    // Category level rollups
    Object.entries(UPGRADE_CATEGORIES).forEach(([categoryKey, category]) => {
      const ids = Object.values(UPGRADES)
        .filter((u) => u.category === (categoryKey as keyof typeof UPGRADE_CATEGORIES))
        .map((u) => u.id);
      const totalLevels = ids.reduce((sum, id) => sum + (gameState.upgrades[id] || 0), 0);
      stats.push({
        title: `${category.name} Upgrades`,
        value: `Lv. ${totalLevels} across ${ids.length}`,
        icon: category.icon as Icon,
      });
    });

    // --- Achievements (unlocked only) ---
    const unlockedAchievements = Object.entries(gameState.achievements || {})
      .filter(([, v]) => v?.unlocked)
      .map(([id, v]) => {
        const key = id as AchievementId;
        return {
          id: key,
          unlockedAt: v.unlockedAt,
          def: ACHIEVEMENTS[key],
        };
      })
      .filter((a) => a.def)
      .sort((a, b) => b.unlockedAt - a.unlockedAt);
    const totalAchievements = Object.keys(ACHIEVEMENTS).length;

    // --- Milestones ---
    type MilestoneInfo = {
      upgradeId: string;
      title: string;
      currentLevel: number;
      achieved: string[];
      currentBonus: number;
    };
    const milestoneRows: MilestoneInfo[] = [];
    Object.values(UPGRADES).forEach((u) => {
      const level = gameState.upgrades[u.id] || 0;
      const achieved: string[] = [];
      for (let i = 0; i < u.milestoneLevels.length; i++) {
        if (level >= u.milestoneLevels[i]) {
          achieved.push(`L${u.milestoneLevels[i]} ×${u.milestoneMultipliers[i]}`);
        }
      }
      if (achieved.length > 0) {
        milestoneRows.push({
          upgradeId: u.id,
          title: u.name,
          currentLevel: level,
          achieved,
          currentBonus: gameState.milestoneBonuses[u.id] || 1,
        });
      }
    });

    push(
      <List navigationTitle="Game Stats">
        <List.Section title="Stats">
          {stats.map((stat, index) => (
            <List.Item key={`stat-${index}`} title={stat.title} subtitle={stat.value} icon={stat.icon} />
          ))}
        </List.Section>

        <List.Section title={`Achievements (${unlockedAchievements.length}/${totalAchievements})`} subtitle="Unlocked">
          {unlockedAchievements.length === 0 ? (
            <List.Item title="No achievements yet" subtitle="Keep playing to unlock some!" icon={Icon.Circle} />
          ) : (
            unlockedAchievements.map((a) => (
              <List.Item
                key={`ach-${a.id}`}
                title={a.def.name}
                subtitle={new Date(a.unlockedAt).toLocaleString()}
                icon={Icon.CheckCircle}
                accessories={[
                  { tag: a.def.icon, tooltip: a.def.name },
                  { icon: Icon.Info, tooltip: achievementWhy(a.id) },
                ]}
                actions={
                  <ActionPanel>
                    <Action
                      title="Show Why Unlocked"
                      icon={Icon.Info}
                      onAction={() =>
                        showToast({
                          style: Toast.Style.Success,
                          title: a.def.name,
                          message: achievementWhy(a.id),
                        })
                      }
                    />
                    <Action.CopyToClipboard title="Copy Why" content={achievementWhy(a.id)} />
                  </ActionPanel>
                }
              />
            ))
          )}
        </List.Section>

        <List.Section title="Milestones" subtitle="Achieved across upgrades">
          {milestoneRows.length === 0 ? (
            <List.Item
              title="No milestones reached yet"
              subtitle="Hit L10+ thresholds to unlock bonuses"
              icon={Icon.Circle}
            />
          ) : (
            milestoneRows.map((m) => (
              <List.Item
                key={`ms-${m.upgradeId}`}
                title={m.title}
                subtitle={m.achieved.join(", ")}
                icon={Icon.Star}
                accessories={[{ text: `Lv. ${m.currentLevel}` }, { tag: `×${m.currentBonus}` }]}
              />
            ))
          )}
        </List.Section>
      </List>,
    );
  }, [push, gameState]);

  // Handle showing prestige upgrades
  const handleShowPrestigeUpgrades = useCallback(() => {
    push(
      <PrestigeView
        gameState={gameState}
        onPurchasePrestigeUpgrade={handlePrestigeUpgrade}
        onPrestige={async () => {
          const confirmed = await confirmAlert({
            title: "Prestige Confirmation",
            message: "Are you sure you want to prestige? This will reset your progress but give you permanent bonuses.",
          });
          if (!confirmed) return false;
          const gained = calculatePrestigePoints((gameState.prestige.totalEarned || 0) as number, PRESTIGE_PP_DIVISOR);
          if (gained <= 0) {
            showToast({ style: Toast.Style.Failure, title: "Not enough to prestige" });
            return false;
          }
          prestige();
          return true;
        }}
      />,
    );
  }, [gameState, handlePrestigeUpgrade, push, prestige]);

  // Handle prestige
  const handlePrestige = useCallback(async () => {
    if (
      await confirmAlert({
        title: "Prestige Confirmation",
        message: "Are you sure you want to prestige? This will reset your progress but give you permanent bonuses.",
      })
    ) {
      prestige();
      showToast({
        style: Toast.Style.Success,
        title: "Prestiged!",
        message: `You've reached a new prestige level!`,
      });
    }
  }, [prestige]);

  return (
    <GameView
      gameState={gameState}
      comboMultiplier={comboMultiplier}
      onEarn={handleClick}
      onUpgrade={handleUpgrade}
      onUpgradeMax={handleUpgradeMax}
      onToggleLuckyToasts={toggleLuckyToasts}
      onReset={reset}
      onPrestige={handlePrestige}
      onShowStats={handleShowStats}
      onShowPrestigeUpgrades={handleShowPrestigeUpgrades}
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
    />
  );
}
