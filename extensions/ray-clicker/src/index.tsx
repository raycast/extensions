import { Icon, List, useNavigation, showToast, Toast, confirmAlert } from "@raycast/api";
import { useState, useRef, useCallback } from "react";
import { GameView } from "./GameView";
import { PrestigeView } from "./PrestigeView";
import { useGameState } from "./useGameState";
import { UPGRADES, UPGRADE_CATEGORIES } from "./types";
import { formatNumber } from "./utils";

// --- Main Clicker Game View ---
export default function Command() {
  const { push, pop } = useNavigation();
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
  const [comboCount, setComboCount] = useState(0);
  const [comboMultiplier, setComboMultiplier] = useState(1);
  const comboTimeout = useRef<NodeJS.Timeout | null>(null);

  // Handle click with combo logic
  const handleClick = useCallback(() => {
    // Call the game state's click handler
    click();

    // Update combo
    setComboCount((prev) => {
      const next = prev + 1;
      const newMultiplier = 1 + Math.floor(next / 10);
      setComboMultiplier(newMultiplier);

      // Reset combo after delay
      if (comboTimeout.current) clearTimeout(comboTimeout.current);
      comboTimeout.current = setTimeout(() => {
        setComboCount(0);
        setComboMultiplier(1);
      }, 3000);

      return next;
    });
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

  // Buy 10 removed per request

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
    const stats = [
      { title: "Current Points", value: formatNumber(gameState.currency), icon: Icon.Coins },
      { title: "Total Points Earned", value: formatNumber(gameState.prestige.totalEarned), icon: Icon.Coin },
      { title: "Points Per Second", value: formatNumber(gameState.idleRate * 5), icon: Icon.Gauge },
      { title: "Click Value", value: formatNumber(gameState.clickValue), icon: Icon.Dot },
      { title: "Prestige Level", value: gameState.prestige.level.toString(), icon: Icon.Star },
      { title: "Prestige Points", value: formatNumber(gameState.prestige.prestigePoints), icon: Icon.Star },
      { title: "Multiplier", value: `x${(1 + gameState.prestige.level * 0.1).toFixed(2)}`, icon: Icon.ArrowUpCircle },
    ];

    // Add lucky chance and frugal discount indicators
    const luckyLevel = gameState.upgrades["luckyCommands"] || 0;
    const luckyChance = luckyLevel > 0 ? 0.01 + Math.max(0, luckyLevel - 1) * 0.0001 : 0;
    const frugalLevel = gameState.prestige.upgrades["frugalShopper"] || 0;
    const frugalFactor = Math.max(0.01, 1 - 0.02 * frugalLevel);
    const frugalDiscountPct = (1 - frugalFactor) * 100;
    stats.push({ title: "Lucky Chance", value: `${(luckyChance * 100).toFixed(2)}%`, icon: Icon.Stars });
    stats.push({ title: "Frugal Discount", value: `${frugalDiscountPct.toFixed(2)}% off`, icon: Icon.Tag });

    // Add upgrade levels
    Object.entries(UPGRADE_CATEGORIES).forEach(([categoryKey, category]) => {
      const upgradeCount = Object.values(UPGRADES).filter((u) => u.category === categoryKey).length;
      const currentLevel = gameState.upgrades[categoryKey as keyof typeof gameState.upgrades] || 0;

      stats.push({
        title: `${category.name} Upgrades`,
        value: `${currentLevel}/${upgradeCount * 100}`, // Assuming max level 100 per upgrade
        icon: category.icon as Icon,
      });
    });

    push(
      <List navigationTitle="Game Stats">
        {stats.map((stat, index) => (
          <List.Item key={index} title={stat.title} subtitle={stat.value} icon={stat.icon} />
        ))}
      </List>,
    );
  }, [push, gameState]);

  // Handle showing prestige upgrades
  const handleShowPrestigeUpgrades = useCallback(() => {
    push(<PrestigeView gameState={gameState} onPurchasePrestigeUpgrade={handlePrestigeUpgrade} onBack={() => pop()} />);
  }, [gameState, handlePrestigeUpgrade, push, pop]);

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
      gameState={{ ...gameState, idleRate: gameState.idleRate * 5 }} // Convert to per second for display
      comboCount={comboCount}
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
