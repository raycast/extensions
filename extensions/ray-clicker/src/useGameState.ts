import { useEffect, useState, useCallback, useRef } from "react";
import { showToast, Toast, LocalStorage } from "@raycast/api";
import {
  GameState,
  INITIAL_STATE,
  UPGRADES,
  calculateUpgradeCost,
  calculateUpgradeEffect,
  getMilestoneBonus,
} from "./types";
import { loadGameState, saveGameState, resetGameState } from "./storage";
import { PRESTIGE_UPGRADES, calculatePrestigeUpgradeCost, calculatePrestigeUpgradeEffect } from "./prestigeUpgrades";

// Only trigger UI updates when the gain exceeds this epsilon to avoid noisy re-renders
const MIN_GAIN_EPS = 0.01;

interface UseGameStateReturn {
  gameState: GameState & { idleRate: number };
  click: () => void;
  purchaseUpgrade: (upgradeId: string) => boolean;
  purchaseUpgradeMax: (upgradeId: string) => number;
  purchasePrestigeUpgrade: (upgradeId: string) => boolean;
  reset: () => Promise<GameState>;
  prestige: () => void;
  isLoading: boolean;
  lastClickTime: number;
  toggleLuckyToasts: () => void;
}

export function useGameState(): UseGameStateReturn {
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [lastClickTime, setLastClickTime] = useState<number>(0);
  const lastUpdateRef = useRef<number>(Date.now());
  const latestStateRef = useRef<GameState>(INITIAL_STATE);

  // Calculate derived game state values
  const calculateDerivedState = useCallback((state: GameState) => {
    // Base click value starts at 1.0
    let clickValue = 1.0;
    let idleRate = 0;
    let efficiencyMultiplier = 1;
    let autoClickLevel = 0;

    // Process each upgrade individually
    Object.entries(state.upgrades).forEach(([upgradeId, level]) => {
      const upgrade = UPGRADES[upgradeId as keyof typeof UPGRADES];
      if (!upgrade) return;

      const milestoneBonus = state.milestoneBonuses[upgradeId] || 1;
      const effect = calculateUpgradeEffect(upgrade, level, milestoneBonus);

      // Apply effect based on upgrade category
      switch (upgrade.category) {
        case "active":
          clickValue += effect;
          break;
        case "idle":
          idleRate += effect;
          break;
        case "efficiency": {
          // Only production-related efficiency upgrades should affect production
          // Skip non-production efficiency upgrades here; they are handled elsewhere
          if (upgrade.id === "raycastProMode" || upgrade.id === "luckyCommands" || upgrade.id === "autoClickDaemon") {
            if (upgrade.id === "autoClickDaemon") {
              autoClickLevel = level;
            }
            break;
          }
          // Special-case powerful global multiplier
          if (upgrade.id === "aiOptimizer") {
            // Treat effect as a direct multiplier (e.g., ×2 all outputs)
            efficiencyMultiplier *= Math.max(1, effect);
          } else {
            // Treat effect as a fractional boost: multiply by (1 + effect)
            efficiencyMultiplier *= 1 + effect;
          }
          break;
        }
      }
    });

    // Apply prestige upgrade effects
    let prestigeMultiplier = 1;
    let prestigeClickBonus = 0;
    let prestigeIdleBonus = 0;
    let idleSpeedMultiplier = 1; // from Faster Tick

    // Apply effects from prestige upgrades
    Object.entries(state.prestige.upgrades).forEach(([upgradeId, level]) => {
      const upgrade = PRESTIGE_UPGRADES[upgradeId];
      if (!upgrade || level <= 0) return;

      const effect = calculatePrestigeUpgradeEffect(upgrade, level);

      // Apply different effects based on the upgrade
      if (upgradeId === "empoweredLegacy") {
        prestigeMultiplier *= effect;
      } else if (upgradeId === "clickApprentice") {
        prestigeClickBonus += effect;
      } else if (upgradeId === "idleApprentice") {
        prestigeIdleBonus += effect;
      } else if (upgradeId === "infinityEngine") {
        prestigeMultiplier *= effect;
      } else if (upgradeId === "fasterTick") {
        idleSpeedMultiplier *= effect; // effect = 2 (once)
      }
    });

    // Apply prestige level bonus (10% per level)
    const prestigeLevelBonus = 1 + state.prestige.level * 0.1;

    // Calculate final click value with all multipliers, ensuring it's at least 1.0
    let finalClickValue =
      (clickValue + prestigeClickBonus) * (efficiencyMultiplier * prestigeMultiplier * prestigeLevelBonus);

    // Ensure click value is at least 1.0
    finalClickValue = Math.max(1.0, finalClickValue);

    // Auto-clicker adds clicks per second equal to level * clickValue
    const autoClickRate = autoClickLevel > 0 ? finalClickValue * autoClickLevel : 0;

    const baseIdle =
      (idleRate + prestigeIdleBonus) *
      efficiencyMultiplier *
      prestigeMultiplier *
      prestigeLevelBonus *
      idleSpeedMultiplier;
    const finalIdle = baseIdle + autoClickRate;

    return {
      ...state,
      clickValue: finalClickValue,
      idleRate: finalIdle,
      // expose computed helpers via closure for cost calc
    };
  }, []);

  // Load saved game state on mount
  useEffect(() => {
    async function load() {
      try {
        const savedState = await loadGameState();
        const now = Date.now();
        const timeDiff = (now - (savedState.lastUpdate || now)) / 1000; // in seconds

        // Calculate offline progress
        if (timeDiff > 0) {
          const derivedState = calculateDerivedState(savedState);
          const offlineEarnings = derivedState.idleRate * timeDiff * 0.5; // 50% of idle rate while offline

          savedState.currency += offlineEarnings;
          savedState.prestige.totalEarned += offlineEarnings;
          savedState.prestige.lifetimeEarned += offlineEarnings;
        }

        savedState.lastUpdate = now;
        setGameState(calculateDerivedState(savedState));
      } catch (error) {
        console.error("Failed to load game state:", error);
        setGameState(calculateDerivedState(INITIAL_STATE));
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [calculateDerivedState]);

  // Game loop for idle generation

  useEffect(() => {
    if (isLoading) return;

    const interval = setInterval(() => {
      (async () => {
        const menuBarActive = await LocalStorage.getItem("idle-menu-bar-active");
        const now = Date.now();
        const prev = lastUpdateRef.current;
        const deltaTime = (now - prev) / 1000; // seconds

        // If menu bar is driving idle accrual, do not trigger React renders here
        if (menuBarActive) {
          lastUpdateRef.current = now;
          return;
        }

        if (deltaTime > 0) {
          setGameState((prevState) => {
            const gained = prevState.idleRate * deltaTime;
            if (gained < MIN_GAIN_EPS) {
              // No visible changes; avoid creating a new object to prevent re-renders
              lastUpdateRef.current = now;
              return prevState;
            }
            const newState = {
              ...prevState,
              currency: prevState.currency + gained,
              prestige: {
                ...prevState.prestige,
                totalEarned: prevState.prestige.totalEarned + gained,
                lifetimeEarned: prevState.prestige.lifetimeEarned + gained,
              },
              lastUpdate: now,
            };
            // Auto-save every ~5s (more reliable persistence)
            if (now - prev >= 5000) {
              saveGameState(newState);
            }
            return newState;
          });
        }

        lastUpdateRef.current = now;
      })();
    }, 1000);

    return () => clearInterval(interval);
  }, [isLoading]);

  // Removed "save on every change" to reduce churn; saving is handled on cadence in the idle loop and critical actions

  // Keep a ref of the latest state for safe save-on-unmount without triggering re-renders
  useEffect(() => {
    latestStateRef.current = gameState;
  }, [gameState]);

  // Save once on unmount as a safety net
  useEffect(() => {
    return () => {
      void saveGameState(latestStateRef.current);
    };
  }, []);

  // Handle click action
  const click = useCallback(() => {
    const now = Date.now();

    // Update game state
    setGameState((prev) => {
      // Get the current derived state with all multipliers applied
      const derivedState = calculateDerivedState(prev);

      // Calculate points earned from this click
      let pointsEarned = derivedState.clickValue;
      // Golden Command event gated by luckyCommands upgrade
      const luckyLevel = prev.upgrades["luckyCommands"] || 0;
      if (luckyLevel > 0) {
        // Base 1% at level 1, +0.01% per additional level
        const chance = 0.01 + Math.max(0, luckyLevel - 1) * 0.0001;
        if (Math.random() < chance) {
          pointsEarned *= 10;
          if (prev.settings?.luckyToastsEnabled) {
            showToast({
              style: Toast.Style.Success,
              title: "Golden Command!",
              message: `x10 Click (${pointsEarned.toFixed(2)})`,
            });
          }
        }
      }

      const newCurrency = prev.currency + pointsEarned;

      // Dev log removed for Store readiness

      // Create new state object
      const newState = {
        ...prev,
        currency: newCurrency,
        prestige: {
          ...prev.prestige,
          totalEarned: prev.prestige.totalEarned + pointsEarned,
          lifetimeEarned: prev.prestige.lifetimeEarned + pointsEarned,
        },
      };

      // Return the new state with derived values
      const derived = calculateDerivedState(newState);
      // Persist click gains immediately so progress isn't lost
      void saveGameState(derived);
      return derived;
    });

    setLastClickTime(now);
  }, [calculateDerivedState]);

  // Handle upgrade purchase
  const purchaseUpgrade = useCallback(
    (upgradeId: string) => {
      const upgrade = UPGRADES[upgradeId as keyof typeof UPGRADES];
      if (!upgrade) return false;

      const currentLevel = gameState.upgrades[upgradeId] || 0;
      // Apply frugal shopper reductions from prestige
      let reductionFactor = 1;
      const frugalLevel = gameState.prestige.upgrades["frugalShopper"] || 0;
      if (frugalLevel > 0) {
        // effect(level) = 1 - 0.02 * level
        reductionFactor = Math.max(0.01, 1 - 0.02 * frugalLevel);
      }
      // Apply Raycast Pro Mode (efficiency cost reduction) if owned
      const rpLevel = gameState.upgrades["raycastProMode"] || 0;
      if (rpLevel > 0) {
        const rpEffect = calculateUpgradeEffect(
          UPGRADES["raycastProMode"],
          rpLevel,
          gameState.milestoneBonuses["raycastProMode"] || 1,
        );
        // Interpret effect as a reduction percent; convert to factor
        const rpFactor = Math.max(0.01, 1 - rpEffect);
        reductionFactor *= rpFactor;
      }
      const baseCost = calculateUpgradeCost(upgrade, currentLevel);
      const cost = Math.ceil(baseCost * reductionFactor);

      if (gameState.currency < cost) {
        showToast({
          style: Toast.Style.Failure,
          title: "Not enough currency!",
          message: `You need ${(cost - gameState.currency).toFixed(2)} more`,
        });
        return false;
      }

      setGameState((prev) => {
        const newUpgrades = { ...prev.upgrades };
        const newLevel = (newUpgrades[upgradeId] || 0) + 1;
        newUpgrades[upgradeId] = newLevel;

        // Check for milestone
        const milestoneBonus = getMilestoneBonus(upgrade, newLevel);
        const prevMilestoneBonus = getMilestoneBonus(upgrade, newLevel - 1);

        // Update milestone bonus if needed
        const newMilestoneBonuses = { ...prev.milestoneBonuses };
        if (milestoneBonus !== prevMilestoneBonus) {
          newMilestoneBonuses[upgradeId] = milestoneBonus;
        }

        const newState = {
          ...prev,
          currency: prev.currency - cost,
          upgrades: newUpgrades,
          milestoneBonuses: newMilestoneBonuses,
        };

        // Show milestone toast if reached
        if (milestoneBonus > prevMilestoneBonus) {
          showToast({
            style: Toast.Style.Success,
            title: "Milestone Reached!",
            message: `${upgrade.name} reached level ${newLevel} (${milestoneBonus}x bonus)!`,
          });
        }

        // Persist immediately so purchases aren't lost if the command closes
        // Persist immediately so purchases aren't lost if the command closes
        void saveGameState(newState);
        return calculateDerivedState(newState);
      });

      showToast({
        style: Toast.Style.Success,
        title: `${upgrade.name} Purchased!`,
        message: `Level ${currentLevel + 1}`,
      });

      return true;
    },
    [gameState, calculateDerivedState],
  );

  // Buy as many levels as possible
  const purchaseUpgradeMax = useCallback(
    (upgradeId: string) => {
      let bought = 0;
      // Limit iterations to avoid long loops
      for (let i = 0; i < 1000; i++) {
        const success = ((): boolean => {
          const upgrade = UPGRADES[upgradeId as keyof typeof UPGRADES];
          if (!upgrade) return false;
          const currentLevel = (gameState.upgrades[upgradeId] || 0) + bought;
          let reductionFactor = 1;
          const frugalLevel = gameState.prestige.upgrades["frugalShopper"] || 0;
          if (frugalLevel > 0) {
            reductionFactor = Math.max(0.01, 1 - 0.02 * frugalLevel);
          }
          const rpLevel = gameState.upgrades["raycastProMode"] || 0;
          if (rpLevel > 0) {
            const rpEffect = calculateUpgradeEffect(
              UPGRADES["raycastProMode"],
              rpLevel,
              gameState.milestoneBonuses["raycastProMode"] || 1,
            );
            const rpFactor = Math.max(0.01, 1 - rpEffect);
            reductionFactor *= rpFactor;
          }
          const baseCost = calculateUpgradeCost(upgrade, currentLevel);
          const cost = Math.ceil(baseCost * reductionFactor);
          if (gameState.currency - cost < 0) return false;
          return true;
        })();
        if (!success) break;
        // perform a single purchase using existing function
        if (!purchaseUpgrade(upgradeId)) break;
        bought++;
      }
      return bought;
    },
    [gameState, purchaseUpgrade],
  );

  // Bulk purchase removed per request

  const toggleLuckyToasts = useCallback(() => {
    setGameState((prev) => {
      const enabled = !(prev.settings?.luckyToastsEnabled ?? true);
      const next = {
        ...prev,
        settings: {
          ...prev.settings,
          luckyToastsEnabled: enabled,
        },
      };
      showToast({
        style: Toast.Style.Success,
        title: `Lucky Toasts ${enabled ? "Enabled" : "Disabled"}`,
      });
      void saveGameState(next);
      return next;
    });
  }, []);

  // Handle prestige reset
  const prestige = useCallback(() => {
    // Slightly faster: floor(sqrt(total_earned / 8e5))
    const prestigePoints = Math.floor(Math.sqrt(gameState.prestige.totalEarned / 800_000));

    if (prestigePoints < 1) {
      const requiredForOne = 800_000; // need at least 8e5 total earned for 1 PP
      const remaining = Math.max(0, requiredForOne - gameState.prestige.totalEarned);
      showToast({
        style: Toast.Style.Failure,
        title: "Not enough progress!",
        message: `Earn ${remaining.toFixed(0)} more total to gain your first Prestige Point.`,
      });
      return;
    }

    setGameState((prev) => {
      const next = {
        ...INITIAL_STATE,
        lastUpdate: Date.now(),
        prestige: {
          level: prev.prestige.level + 1,
          totalEarned: 0,
          prestigePoints: prev.prestige.prestigePoints + prestigePoints,
          lifetimeEarned: prev.prestige.lifetimeEarned,
          upgrades: prev.prestige.upgrades,
        },
      } as GameState;
      void saveGameState(next);
      return next;
    });

    showToast({
      style: Toast.Style.Success,
      title: "Prestige Complete!",
      message: `Gained ${prestigePoints} prestige point${prestigePoints === 1 ? "" : "s"}!`,
    });
  }, [gameState.prestige.totalEarned]);

  // Reset game to initial state
  const reset = async () => {
    try {
      await resetGameState();
      const newState = {
        ...INITIAL_STATE,
        lastUpdate: Date.now(),
      };
      setGameState(calculateDerivedState(newState));
      setLastClickTime(0);
      return newState;
    } catch (error) {
      showToast({
        title: "Failed to reset game",
        message: error instanceof Error ? error.message : String(error),
        style: Toast.Style.Failure,
      });
      throw error;
    }
  };

  // Handle prestige upgrade purchase
  const purchasePrestigeUpgrade = useCallback(
    (upgradeId: string) => {
      const upgrade = PRESTIGE_UPGRADES[upgradeId];
      if (!upgrade) return false;

      const currentLevel = gameState.prestige.upgrades[upgradeId] || 0;

      // Check if already at max level
      if (currentLevel >= upgrade.maxLevel) {
        showToast({
          style: Toast.Style.Failure,
          title: "Maximum level reached",
          message: `${upgrade.name} is already at maximum level`,
        });
        return false;
      }

      const cost = calculatePrestigeUpgradeCost(upgrade, currentLevel);

      // Check if can afford
      if (gameState.prestige.prestigePoints < cost) {
        showToast({
          style: Toast.Style.Failure,
          title: "Not enough prestige points",
          message: `You need ${cost - gameState.prestige.prestigePoints} more prestige points`,
        });
        return false;
      }

      // Purchase the upgrade
      setGameState((prev) => {
        const newPrestigeUpgrades = { ...prev.prestige.upgrades };
        newPrestigeUpgrades[upgradeId] = (newPrestigeUpgrades[upgradeId] || 0) + 1;

        const newState = {
          ...prev,
          prestige: {
            ...prev.prestige,
            prestigePoints: prev.prestige.prestigePoints - cost,
            upgrades: newPrestigeUpgrades,
          },
        };

        // Apply special effects based on the upgrade
        if (upgradeId === "bulkBuyerPro") {
          newState.settings.bulkBuyEnabled = true;
        } else if (upgradeId === "fasterTick") {
          newState.settings.offlineProgressEnabled = true;
        } else if (upgradeId === "autoClickDaemon") {
          newState.settings.autoClickEnabled = true;
        }

        // Persist immediately so prestige upgrades and setting toggles aren't lost
        void saveGameState(newState);
        return calculateDerivedState(newState);
      });

      showToast({
        style: Toast.Style.Success,
        title: `${upgrade.name} Purchased!`,
        message: `Level ${(gameState.prestige.upgrades[upgradeId] || 0) + 1}/${upgrade.maxLevel}`,
      });

      return true;
    },
    [gameState, calculateDerivedState],
  );

  // Return the game state and actions
  return {
    gameState,
    click,
    purchaseUpgrade,
    purchaseUpgradeMax,
    purchasePrestigeUpgrade,
    reset,
    prestige,
    isLoading,
    lastClickTime,
    toggleLuckyToasts,
  };
}
