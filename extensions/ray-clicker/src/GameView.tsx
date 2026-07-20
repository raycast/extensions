import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  confirmAlert,
  Alert,
  launchCommand,
  LaunchType,
  showToast,
  Toast,
} from "@raycast/api";
import { useState, useEffect, useRef, useMemo } from "react";
import { formatNumber } from "./utils";
import { UPGRADES, type GameState, UPGRADE_CATEGORIES, calculateUpgradeCost, calculateUpgradeEffect } from "./types";
import { useClickEffect } from "./effects/ClickEffect";

// Removed ClickPosition type as we're no longer using position-based effects

type GameViewProps = {
  gameState: GameState & { idleRate: number };
  comboMultiplier: number;
  onUpgrade: (id: string) => void;
  onUpgradeMax: (id: string) => void;
  onEarn: () => void;
  onReset: () => void;
  onPrestige: () => void;
  onShowStats: () => void;
  onShowPrestigeUpgrades: () => void;
  onSearchTextChange: (text: string) => void;
  isLoading: boolean;
  onToggleLuckyToasts: () => void;
};

// Default empty game state to prevent undefined errors
const defaultGameState: GameState = {
  settings: {
    bulkBuyEnabled: false,
    autoClickEnabled: false,
    offlineProgressEnabled: true,
    luckyToastsEnabled: true,
  },
  currency: 0,
  clickValue: 1,
  idleRate: 0,
  lastUpdate: Date.now(),
  upgrades: {},
  milestoneBonuses: {},
  prestige: {
    upgrades: {},
    level: 0,
    totalEarned: 0,
    prestigePoints: 0,
    lifetimeEarned: 0,
  },
};

export function GameView({
  gameState,
  comboMultiplier,
  onUpgrade,
  onUpgradeMax,
  onEarn,
  onReset,
  onPrestige,
  onShowStats,
  onShowPrestigeUpgrades,
  onSearchTextChange,
  isLoading,
  onToggleLuckyToasts,
}: GameViewProps) {
  // Ensure we have a valid game state
  const safeGameState = useMemo(
    () => ({
      ...defaultGameState,
      ...gameState,
      upgrades: {
        ...defaultGameState.upgrades,
        ...(gameState?.upgrades || {}),
      },
      prestige: {
        ...defaultGameState.prestige,
        ...(gameState?.prestige || {}),
      },
    }),
    [gameState],
  );

  const [isClicking, setIsClicking] = useState(false);
  const [activeCategory, setActiveCategory] = useState<keyof typeof UPGRADE_CATEGORIES>("active");
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Use the new click effect hook
  const { triggerClickEffect } = useClickEffect();

  // We'll use direct filtering in the render method instead of memoizing filteredUpgrades

  // Removed HTML overlays in favor of Raycast-native UI only

  // Handle click effects
  const handleClick = () => {
    if (isClicking) return;

    setIsClicking(true);
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }

    // Calculate points with multiplier
    const pointsEarned = safeGameState.clickValue * comboMultiplier;

    // Trigger the click effect with the points and combo
    triggerClickEffect(pointsEarned, comboMultiplier);

    // Trigger the click action
    onEarn();

    // Reset clicking state after a short delay
    clickTimeoutRef.current = setTimeout(() => {
      setIsClicking(false);
    }, 100);
  };

  // Removed milestone HTML overlay effect

  // Removed unused utility functions

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <List
        navigationTitle="Raycast Clicker"
        searchBarPlaceholder="Search upgrades..."
        onSearchTextChange={onSearchTextChange}
        isLoading={isLoading}
        filtering={true}
        searchBarAccessory={
          <List.Dropdown
            tooltip="Upgrade Categories"
            value={activeCategory}
            onChange={(newValue) => setActiveCategory(newValue as keyof typeof UPGRADE_CATEGORIES)}
          >
            {Object.entries(UPGRADE_CATEGORIES).map(([key, category]) => (
              <List.Dropdown.Item key={key} title={`${category.icon} ${category.name}`} value={key} />
            ))}
          </List.Dropdown>
        }
      >
        {/* No visual effects inside List component */}

        <List.Section title="💰 Clicker">
          <List.Item
            title={`${formatNumber(safeGameState.currency)} points`}
            subtitle={`Click to earn ${formatNumber(safeGameState.clickValue * comboMultiplier)} points`}
            icon={{
              source: isClicking ? Icon.StarCircle : Icon.Star,
              tintColor: isClicking ? Color.Yellow : undefined,
            }}
            accessories={[{ text: "⌘C", icon: Icon.Keyboard, tooltip: "Click to Earn" }]}
            actions={
              <ActionPanel>
                <Action
                  title="Click to Earn"
                  icon={Icon.Coins}
                  onAction={handleClick}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <ActionPanel.Submenu title="Switch Category (⌘P)" icon={Icon.List}>
                  <Action
                    title="Active"
                    icon={Icon.Star}
                    shortcut={{ modifiers: ["cmd"], key: "1" }}
                    onAction={() => setActiveCategory("active")}
                  />
                  <Action
                    title="Idle"
                    icon={Icon.Clock}
                    shortcut={{ modifiers: ["cmd"], key: "2" }}
                    onAction={() => setActiveCategory("idle")}
                  />
                  <Action
                    title="Efficiency"
                    icon={Icon.Gauge}
                    shortcut={{ modifiers: ["cmd"], key: "3" }}
                    onAction={() => setActiveCategory("efficiency")}
                  />
                </ActionPanel.Submenu>
                <Action
                  title="Prestige Upgrades"
                  onAction={onShowPrestigeUpgrades}
                  icon={Icon.Stars}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                />
                <Action
                  title="Show Stats"
                  onAction={onShowStats}
                  icon={Icon.BarChart}
                  shortcut={{ modifiers: ["cmd"], key: "s" }}
                />
                <Action
                  title="Toggle Lucky Toasts"
                  onAction={onToggleLuckyToasts}
                  icon={Icon.Bell}
                  shortcut={{ modifiers: ["cmd"], key: "t" }}
                />
                <Action
                  title="Enable Background (Menu Bar)"
                  icon={Icon.AppWindow}
                  onAction={async () => {
                    try {
                      await launchCommand({ name: "menu-bar", type: LaunchType.UserInitiated });
                    } catch (e) {
                      await showToast({
                        style: Toast.Style.Failure,
                        title: "Failed to open Menu Bar",
                        message: e instanceof Error ? e.message : String(e),
                      });
                    }
                  }}
                />
                {/* Category actions moved below Click to Earn; removed Cycle Category (reserved shortcut) */}
              </ActionPanel>
            }
          />
          <List.Item
            title={`Idle Income`}
            subtitle={`${formatNumber(safeGameState.idleRate)}/sec`}
            icon={{ source: Icon.ArrowClockwise }}
          />
          <List.Item
            title="Prestige Menu"
            subtitle="Unlock permanent upgrades"
            icon={Icon.Stars}
            accessories={[
              {
                icon: Icon.ArrowRight,
                tooltip: "Open Prestige Menu",
              },
            ]}
            actions={
              <ActionPanel>
                <Action title="Open Prestige Menu" onAction={onShowPrestigeUpgrades} icon={Icon.Stars} />
                <Action title="Prestige Now" onAction={onPrestige} icon={Icon.Star} />
                <Action title="Show Stats" onAction={onShowStats} icon={Icon.BarChart} />
                <Action
                  title="Reset Game"
                  onAction={async () => {
                    if (
                      await confirmAlert({
                        title: "Reset Game",
                        message: "Are you sure you want to reset your game? This cannot be undone.",
                        primaryAction: { title: "Reset", style: Alert.ActionStyle.Destructive },
                      })
                    ) {
                      onReset();
                    }
                  }}
                  style={Action.Style.Destructive}
                  icon={Icon.Trash}
                />
              </ActionPanel>
            }
          />
        </List.Section>

        <List.Section title={`${UPGRADE_CATEGORIES[activeCategory].name} Upgrades`}>
          {Object.values(UPGRADES)
            .filter((upgrade) => upgrade.category === activeCategory)
            .map((upgrade) => {
              const level = safeGameState.upgrades[upgrade.id] || 0;
              const cost = calculateUpgradeCost(upgrade, level);
              const effect = calculateUpgradeEffect(upgrade, level, safeGameState.milestoneBonuses[upgrade.id] || 1);
              // Use the last milestone level as the max level, or Infinity if no milestones
              const maxLevel =
                upgrade.milestoneLevels?.length > 0 ? Math.max(...upgrade.milestoneLevels) * 2 : Infinity;
              const isMaxed = level >= maxLevel;
              const canAfford = safeGameState.currency >= cost;
              // Buy Max visibility: only when unlocked via prestige (Bulk Buyer Pro) or setting
              const hasBuyMax = Boolean(
                safeGameState.settings?.bulkBuyEnabled || (safeGameState.prestige?.upgrades?.["bulkBuyerPro"] || 0) > 0,
              );

              // Estimate Buy Max count (greedy)
              let estBuy = 0;
              if (!isMaxed && hasBuyMax) {
                const frugalLevel = safeGameState.prestige.upgrades["frugalShopper"] || 0;
                let reduction = 1;
                if (frugalLevel > 0) reduction = Math.max(0.01, 1 - 0.02 * frugalLevel);
                // Apply Raycast Pro Mode discount
                const rpLevel = safeGameState.upgrades["raycastProMode"] || 0;
                if (rpLevel > 0) {
                  const rpEffect = calculateUpgradeEffect(
                    UPGRADES["raycastProMode"],
                    rpLevel,
                    safeGameState.milestoneBonuses["raycastProMode"] || 1,
                  );
                  reduction *= Math.max(0.01, 1 - rpEffect);
                }
                let remaining = safeGameState.currency;
                let lvl = level;
                for (let i = 0; i < 1000; i++) {
                  const base = calculateUpgradeCost(upgrade, lvl);
                  const c = Math.ceil(base * reduction);
                  if (remaining - c < 0) break;
                  remaining -= c;
                  lvl += 1;
                  estBuy += 1;
                }
              }

              return (
                <List.Item
                  key={upgrade.id}
                  title={`${upgrade.name} (Lv. ${level}${isMaxed ? " (MAX)" : ""})`}
                  subtitle={upgrade.description}
                  accessories={[
                    {
                      text: `${formatNumber(cost)}`,
                      icon: canAfford ? Icon.Coins : Icon.XmarkCircle,
                    },
                    (() => {
                      // More accurate effect display per upgrade
                      if (upgrade.category === "efficiency") {
                        if (upgrade.id === "raycastProMode") {
                          return { text: `Cost -${(effect * 100).toFixed(1)}%`, icon: Icon.Tag } as const;
                        }
                        if (upgrade.id === "luckyCommands") {
                          const luckyLevel = level;
                          const chance = 0.01 + Math.max(0, luckyLevel - 1) * 0.0001;
                          return { text: `Lucky ${(chance * 100).toFixed(2)}%`, icon: Icon.Stars } as const;
                        }
                        if (upgrade.id === "autoClickDaemon") {
                          return { text: `Auto ${level}/s`, icon: Icon.Clock } as const;
                        }
                        if (upgrade.id === "aiOptimizer") {
                          return { text: `x${effect.toFixed(2)} all`, icon: Icon.Gauge } as const;
                        }
                        return { text: `x${(1 + effect).toFixed(2)} all`, icon: Icon.Gauge } as const;
                      }
                      // Active and idle show additive effect
                      return {
                        text: `+${formatNumber(effect)}${upgrade.category === "idle" ? "/s" : ""}`,
                        icon: Icon.Gauge,
                      } as const;
                    })(),
                    // Keyboard hint for Buy
                    ...(!isMaxed ? ([{ text: "⌘B", icon: Icon.Keyboard, tooltip: "Buy" }] as const) : ([] as const)),
                    // Optional Buy Max preview
                    ...(hasBuyMax && estBuy > 0
                      ? ([{ text: `Buy Max → ${estBuy}`, icon: Icon.ArrowDownCircle }] as const)
                      : ([] as const)),
                  ]}
                  actions={
                    <ActionPanel>
                      {!isMaxed && (
                        <Action
                          title={`Buy ${upgrade.name}`}
                          icon={Icon.Plus}
                          onAction={() => onUpgrade(upgrade.id)}
                          shortcut={{ modifiers: ["cmd"], key: "b" }}
                        />
                      )}
                      {/* Buy 10 removed per request */}
                      {hasBuyMax && !isMaxed && (
                        <Action
                          title={`Buy Max${estBuy > 0 ? ` (${estBuy})` : ""}`}
                          icon={Icon.ArrowDownCircle}
                          onAction={() => onUpgradeMax(upgrade.id)}
                          shortcut={{ modifiers: ["cmd"], key: "m" }}
                        />
                      )}
                      <ActionPanel.Submenu title="Switch Category (⌘P)" icon={Icon.List}>
                        <Action
                          title="Active"
                          icon={Icon.Star}
                          shortcut={{ modifiers: ["cmd"], key: "1" }}
                          onAction={() => setActiveCategory("active")}
                        />
                        <Action
                          title="Idle"
                          icon={Icon.Clock}
                          shortcut={{ modifiers: ["cmd"], key: "2" }}
                          onAction={() => setActiveCategory("idle")}
                        />
                        <Action
                          title="Efficiency"
                          icon={Icon.Gauge}
                          shortcut={{ modifiers: ["cmd"], key: "3" }}
                          onAction={() => setActiveCategory("efficiency")}
                        />
                      </ActionPanel.Submenu>
                      <Action title="Show Stats" onAction={onShowStats} icon={Icon.BarChart} />
                      <Action title="Prestige Upgrades" onAction={onShowPrestigeUpgrades} icon={Icon.Stars} />
                      <Action
                        title="Reset Game"
                        onAction={onReset}
                        style={Action.Style.Destructive}
                        icon={Icon.Trash}
                      />
                    </ActionPanel>
                  }
                />
              );
            })}
        </List.Section>
      </List>
    </>
  );
}
