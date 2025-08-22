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
import { ACHIEVEMENTS } from "./achievements";
import { PRESTIGE_PP_DIVISOR } from "./constants";
import { calculatePrestigePoints } from "./utils";

// Only trigger UI updates when the gain exceeds this epsilon to avoid noisy re-renders
const MIN_GAIN_EPS = 0.01;

interface UseGameStateReturn {
  gameState: GameState & { idleRate: number };
  click: (multiplier?: number) => void;
  purchaseUpgrade: (upgradeId: string, options?: { silent?: boolean }) => boolean;
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
  // In-run counters (not persisted)
  const clickTimesRef = useRef<number[]>([]); // timestamps of last 30s
  const luckyTriggersRef = useRef<number>(0);
  const insufficientAttemptsRef = useRef<number>(0);

  // Toggle lucky toasts visibility
  const toggleLuckyToasts = useCallback(() => {
    setGameState((prev) => {
      const newState: GameState = {
        ...prev,
        settings: {
          ...prev.settings,
          luckyToastsEnabled: !prev.settings.luckyToastsEnabled,
        },
      };
      void saveGameState(newState);
      return newState;
    });
  }, []);

  // Helper to compute current cost reduction factor
  const getCostReductionFactor = useCallback((state: GameState): number => {
    const frugalLevel = state.prestige.upgrades["frugalShopper"] || 0;
    let factor = Math.max(0.01, 1 - 0.02 * frugalLevel);
    const rpLevel = state.upgrades["raycastProMode"] || 0;
    if (rpLevel > 0) {
      const rpEffect = calculateUpgradeEffect(
        UPGRADES["raycastProMode"],
        rpLevel,
        state.milestoneBonuses["raycastProMode"] || 1,
      );
      // rpEffect interpreted as percent reduction in [0, ~0.99]
      factor *= Math.max(0.01, 1 - rpEffect);
    }
    return factor;
  }, []);

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
              const ms = state.milestoneBonuses[upgrade.id] || 1;
              autoClickLevel = level * ms;
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

  // Purchase single level
  const purchaseUpgrade = useCallback(
    (upgradeId: string, options?: { silent?: boolean }) => {
      const def = UPGRADES[upgradeId as keyof typeof UPGRADES];
      if (!def) return false;

      const currentLevel = gameState.upgrades[upgradeId] || 0;
      const baseCost = calculateUpgradeCost(def, currentLevel);
      const factor = getCostReductionFactor(gameState);
      const cost = Math.ceil(baseCost * factor);

      if (gameState.currency < cost) {
        insufficientAttemptsRef.current += 1;
        if (insufficientAttemptsRef.current >= 20) {
          setGameState((prev) => {
            const achievements = { ...(prev.achievements || {}) } as NonNullable<GameState["achievements"]>;
            if (!achievements["insufficientFunds"]) {
              achievements["insufficientFunds"] = { unlocked: true, unlockedAt: Date.now() };
              showToast({
                style: Toast.Style.Success,
                title: "Achievement Unlocked!",
                message: ACHIEVEMENTS["insufficientFunds"].name,
              });
            }
            return { ...prev, achievements };
          });
        }
        if (!options?.silent) {
          showToast({ style: Toast.Style.Failure, title: "Not enough RC" });
        }
        return false;
      }

      setGameState((prev) => {
        const factorPrev = getCostReductionFactor(prev);
        const base = calculateUpgradeCost(def, prev.upgrades[upgradeId] || 0);
        const price = Math.ceil(base * factorPrev);
        if (prev.currency < price) return prev; // double-check affordability

        const nextLevel = (prev.upgrades[upgradeId] || 0) + 1;
        const nextUpgrades = { ...prev.upgrades, [upgradeId]: nextLevel };
        const nextMilestone = getMilestoneBonus(def, nextLevel);
        const nextMilestones = { ...prev.milestoneBonuses, [upgradeId]: nextMilestone };

        const newState: GameState = {
          ...prev,
          currency: prev.currency - price,
          upgrades: nextUpgrades,
          milestoneBonuses: nextMilestones,
        };

        // Unlock Optimizer Online when AI Optimizer reaches level 20
        if (upgradeId === "aiOptimizer" && nextLevel >= 20) {
          const achievements = { ...(newState.achievements || {}) } as NonNullable<GameState["achievements"]>;
          if (!achievements["optimizerOnline"]) {
            achievements["optimizerOnline"] = { unlocked: true, unlockedAt: Date.now() };
            showToast({
              style: Toast.Style.Success,
              title: "Achievement Unlocked!",
              message: ACHIEVEMENTS["optimizerOnline"].name,
            });
          }
          newState.achievements = achievements;
        }

        // Unlock Cost Engineer for ≥25% total reduction
        const totalReduction = 1 - getCostReductionFactor(newState);
        if (totalReduction >= 0.25) {
          const achievements = { ...(newState.achievements || {}) } as NonNullable<GameState["achievements"]>;
          if (!achievements["costEngineer"]) {
            achievements["costEngineer"] = { unlocked: true, unlockedAt: Date.now() };
            showToast({
              style: Toast.Style.Success,
              title: "Achievement Unlocked!",
              message: ACHIEVEMENTS["costEngineer"].name,
            });
          }
          newState.achievements = achievements;
        }

        const derivedNext = calculateDerivedState(newState);
        // Additional achievement checks that depend on derived values
        {
          const achievements = {
            ...(derivedNext.achievements || {}),
          } as NonNullable<GameState["achievements"]>;

          // Shortcut Savant: Shortcut Maestro L10
          if (upgradeId === "shortcutMaestro" && nextLevel >= 10 && !achievements["shortcutSavant"]) {
            achievements["shortcutSavant"] = { unlocked: true, unlockedAt: Date.now() };
            showToast({
              style: Toast.Style.Success,
              title: "Achievement Unlocked!",
              message: ACHIEVEMENTS["shortcutSavant"].name,
            });
          }

          // Daemon Wrangler: Background Daemon L5 OR idleRate >= 10
          if (
            ((upgradeId === "backgroundDaemon" && nextLevel >= 5) || derivedNext.idleRate >= 10) &&
            !achievements["daemonWrangler"]
          ) {
            achievements["daemonWrangler"] = { unlocked: true, unlockedAt: Date.now() };
            showToast({
              style: Toast.Style.Success,
              title: "Achievement Unlocked!",
              message: ACHIEVEMENTS["daemonWrangler"].name,
            });
          }

          // Cron Commandant: Cron Job Army L10 OR idleRate >= 100
          if (
            ((upgradeId === "cronJobArmy" && nextLevel >= 10) || derivedNext.idleRate >= 100) &&
            !achievements["cronCommandant"]
          ) {
            achievements["cronCommandant"] = { unlocked: true, unlockedAt: Date.now() };
            showToast({
              style: Toast.Style.Success,
              title: "Achievement Unlocked!",
              message: ACHIEVEMENTS["cronCommandant"].name,
            });
          }

          // Category milestone checks (L25 milestone presence per tree)
          const has25 = { active: false, idle: false, efficiency: false } as Record<
            "active" | "idle" | "efficiency",
            boolean
          >;
          Object.entries(derivedNext.upgrades || {}).forEach(([id, lvl]) => {
            const u = UPGRADES[id as keyof typeof UPGRADES];
            if (u && lvl >= 25) has25[u.category] = true;
          });
          const categoriesReached = Number(has25.active) + Number(has25.idle) + Number(has25.efficiency);
          // Compute total levels per category for synergyOnline
          const totals = { active: 0, idle: 0, efficiency: 0 } as Record<"active" | "idle" | "efficiency", number>;
          Object.entries(derivedNext.upgrades || {}).forEach(([id, lvl]) => {
            const u = UPGRADES[id as keyof typeof UPGRADES];
            if (u) totals[u.category] += Number(lvl || 0);
          });
          if (categoriesReached >= 2 && !achievements["twinPeaks"]) {
            achievements["twinPeaks"] = { unlocked: true, unlockedAt: Date.now() };
            showToast({
              style: Toast.Style.Success,
              title: "Achievement Unlocked!",
              message: ACHIEVEMENTS["twinPeaks"].name,
            });
          }
          if (totals.active >= 25 && totals.idle >= 25 && totals.efficiency >= 25 && !achievements["synergyOnline"]) {
            achievements["synergyOnline"] = { unlocked: true, unlockedAt: Date.now() };
            showToast({
              style: Toast.Style.Success,
              title: "Achievement Unlocked!",
              message: ACHIEVEMENTS["synergyOnline"].name,
            });
          }
          if (categoriesReached >= 3 && !achievements["milestoneTrifecta"]) {
            achievements["milestoneTrifecta"] = { unlocked: true, unlockedAt: Date.now() };
            showToast({
              style: Toast.Style.Success,
              title: "Achievement Unlocked!",
              message: ACHIEVEMENTS["milestoneTrifecta"].name,
            });
          }

          const finalDerivedNext = { ...derivedNext, achievements };
          void saveGameState(finalDerivedNext);
          return finalDerivedNext;
        }

        // Fallback (should not hit due to block return) – keep original behavior
        void saveGameState(derivedNext);
        return derivedNext;
      });

      return true;
    },
    [gameState, getCostReductionFactor, calculateDerivedState],
  );

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

          // Achievements for offline gains
          if (offlineEarnings > 0) {
            savedState.achievements = savedState.achievements || {};
            // AFK IRL: return after >=12h and claim offline progress
            if (timeDiff >= 43200 && !savedState.achievements["afkIrl"]) {
              savedState.achievements["afkIrl"] = { unlocked: true, unlockedAt: Date.now() };
              showToast({
                style: Toast.Style.Success,
                title: "Achievement Unlocked!",
                message: ACHIEVEMENTS["afkIrl"].name,
              });
            }
            // Time Bender: claim offline gains when Faster Tick is active
            const fasterTickLevel = savedState.prestige.upgrades["fasterTick"] || 0;
            if (fasterTickLevel > 0 && !savedState.achievements["timeBender"]) {
              savedState.achievements["timeBender"] = { unlocked: true, unlockedAt: Date.now() };
              showToast({
                style: Toast.Style.Success,
                title: "Achievement Unlocked!",
                message: ACHIEVEMENTS["timeBender"].name,
              });
            }
          }
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

  // (helpers defined above)

  // Game loop for idle generation

  useEffect(() => {
    if (isLoading) return;

    const interval = setInterval(() => {
      (async () => {
        const menuBarActive = await LocalStorage.getItem("idle-menu-bar-active");
        const now = Date.now();
        const prev = lastUpdateRef.current;
        const deltaTime = (now - prev) / 1000; // seconds

        // If the menu bar is accruing, sync from storage so UI reflects gains and skip local accrual
        if (menuBarActive) {
          try {
            const stored = await loadGameState();
            setGameState((prevState) => {
              const incomingTs = typeof stored.lastUpdate === "number" ? stored.lastUpdate : 0;
              const prevTs = typeof prevState.lastUpdate === "number" ? prevState.lastUpdate : 0;
              if (incomingTs > prevTs) {
                return calculateDerivedState(stored);
              }
              return prevState;
            });
          } finally {
            lastUpdateRef.current = now;
          }
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
  const click = useCallback(
    (comboMultiplier: number = 1) => {
      const now = Date.now();

      setGameState((prev) => {
        const derived = calculateDerivedState(prev);
        let pointsEarned = derived.clickValue;

        // Golden Command event gated by luckyCommands upgrade
        const luckyLevel = prev.upgrades["luckyCommands"] || 0;
        if (luckyLevel > 0) {
          // Base 1% at level 1, +0.01% per additional level
          const chance = 0.01 + Math.max(0, luckyLevel - 1) * 0.0001;
          if (Math.random() < chance) {
            const luckyMs = prev.milestoneBonuses["luckyCommands"] || 1;
            pointsEarned *= 10 * luckyMs; // milestone boosts magnitude
            if (prev.settings?.luckyToastsEnabled) {
              showToast({
                style: Toast.Style.Success,
                title: "Golden Command!",
                message: `Lucky! x${(10 * luckyMs).toFixed(0)} Click (${pointsEarned.toFixed(2)})`,
              });
            }
            // Achievement counter for Golden Hour
            luckyTriggersRef.current += 1;
          }
        }

        // Apply combo multiplier immediately to this click (clamped to x3)
        const appliedCombo = Math.min(3, Math.max(1, comboMultiplier));
        pointsEarned *= appliedCombo;

        // Create new state object
        const newState: GameState = {
          ...prev,
          currency: prev.currency + pointsEarned,
          prestige: {
            ...prev.prestige,
            totalEarned: prev.prestige.totalEarned + pointsEarned,
            lifetimeEarned: prev.prestige.lifetimeEarned + pointsEarned,
          },
          lastUpdate: now,
        };

        // Track recent clicks for 30s window
        clickTimesRef.current.push(now);
        while (clickTimesRef.current.length > 0 && clickTimesRef.current[0] < now - 30000) {
          clickTimesRef.current.shift();
        }

        // Achievement checks (centralized names)
        const achievements = { ...(prev.achievements || {}) } as NonNullable<GameState["achievements"]>;
        const maybeUnlock = (id: keyof typeof ACHIEVEMENTS) => {
          if (!achievements[id]) {
            achievements[id] = { unlocked: true, unlockedAt: now };
            showToast({ style: Toast.Style.Success, title: "Achievement Unlocked!", message: ACHIEVEMENTS[id].name });
          }
        };

        // Lifetime milestones
        const lifetime = newState.prestige.lifetimeEarned;
        if (lifetime >= 1_000) maybeUnlock("helloRaycast");
        if (lifetime >= 1_000_000) maybeUnlock("killionaire");
        // Hold The Clicker: ≥180 clicks in 30s
        if (clickTimesRef.current.length >= 180) maybeUnlock("holdTheClicker");
        // Golden Hour: 5 lucky events in one run
        if (luckyTriggersRef.current >= 5) maybeUnlock("goldenHour");
        // Who Needs Idle
        if (lifetime >= 250_000 && derived.idleRate <= 1) maybeUnlock("whoNeedsIdle");

        newState.achievements = achievements;

        const finalState = calculateDerivedState(newState);
        void saveGameState(finalState);
        return finalState;
      });

      // Update last click time (used by UI effects)
      setLastClickTime(now);
    },
    [calculateDerivedState],
  );

  // Purchase as many levels as possible (greedy)
  const purchaseUpgradeMax = useCallback(
    (upgradeId: string) => {
      const def = UPGRADES[upgradeId as keyof typeof UPGRADES];
      if (!def) return 0;

      let bought = 0;
      setGameState((prev) => {
        const state = { ...prev } as GameState;
        let level = state.upgrades[upgradeId] || 0;
        let currency = state.currency;
        for (let i = 0; i < 5000; i++) {
          const factor = getCostReductionFactor(state);
          const base = calculateUpgradeCost(def, level);
          const price = Math.ceil(base * factor);
          if (currency < price) break;
          currency -= price;
          level += 1;
          bought += 1;
        }
        if (bought <= 0) return prev;

        const nextUpgrades = { ...state.upgrades, [upgradeId]: level };
        const nextMilestone = getMilestoneBonus(def, level);
        const nextMilestones = { ...state.milestoneBonuses, [upgradeId]: nextMilestone };
        const newState: GameState = {
          ...state,
          currency,
          upgrades: nextUpgrades,
          milestoneBonuses: nextMilestones,
        };

        // Achievements for bulk/max purchases
        const achievements = { ...(newState.achievements || {}) } as NonNullable<GameState["achievements"]>;
        const bulkUnlocked = Boolean(
          newState.settings?.bulkBuyEnabled || (newState.prestige?.upgrades?.["bulkBuyerPro"] || 0) > 0,
        );
        if (bulkUnlocked && bought >= 10 && !achievements["bulkSend"]) {
          achievements["bulkSend"] = { unlocked: true, unlockedAt: Date.now() };
          showToast({
            style: Toast.Style.Success,
            title: "Achievement Unlocked!",
            message: ACHIEVEMENTS["bulkSend"].name,
          });
        }
        if (bought >= 50 && !achievements["silentMaxxing"]) {
          achievements["silentMaxxing"] = { unlocked: true, unlockedAt: Date.now() };
          showToast({
            style: Toast.Style.Success,
            title: "Achievement Unlocked!",
            message: ACHIEVEMENTS["silentMaxxing"].name,
          });
        }
        newState.achievements = achievements;

        // Recalculate derived and apply additional achievement checks
        let derived = calculateDerivedState(newState);

        const achvNext = {
          ...(derived.achievements || {}),
        } as NonNullable<GameState["achievements"]>;

        // Shortcut Savant: Shortcut Maestro L10
        const smLevel = (nextUpgrades["shortcutMaestro"] || 0) as number;
        if (smLevel >= 10 && !achvNext["shortcutSavant"]) {
          achvNext["shortcutSavant"] = { unlocked: true, unlockedAt: Date.now() };
          showToast({
            style: Toast.Style.Success,
            title: "Achievement Unlocked!",
            message: ACHIEVEMENTS["shortcutSavant"].name,
          });
        }

        // Daemon Wrangler and Cron Commandant via idle thresholds
        if (derived.idleRate >= 10 && !achvNext["daemonWrangler"]) {
          achvNext["daemonWrangler"] = { unlocked: true, unlockedAt: Date.now() };
          showToast({
            style: Toast.Style.Success,
            title: "Achievement Unlocked!",
            message: ACHIEVEMENTS["daemonWrangler"].name,
          });
        }
        if (derived.idleRate >= 100 && !achvNext["cronCommandant"]) {
          achvNext["cronCommandant"] = { unlocked: true, unlockedAt: Date.now() };
          showToast({
            style: Toast.Style.Success,
            title: "Achievement Unlocked!",
            message: ACHIEVEMENTS["cronCommandant"].name,
          });
        }

        // Category milestone checks (L25 milestone presence per tree)
        const has25 = { active: false, idle: false, efficiency: false } as Record<
          "active" | "idle" | "efficiency",
          boolean
        >;
        Object.entries(derived.upgrades || {}).forEach(([id, lvl]) => {
          const u = UPGRADES[id as keyof typeof UPGRADES];
          if (u && (lvl as number) >= 25) has25[u.category] = true;
        });
        const categoriesReached = Number(has25.active) + Number(has25.idle) + Number(has25.efficiency);
        if (categoriesReached >= 2 && !achvNext["twinPeaks"]) {
          achvNext["twinPeaks"] = { unlocked: true, unlockedAt: Date.now() };
          showToast({
            style: Toast.Style.Success,
            title: "Achievement Unlocked!",
            message: ACHIEVEMENTS["twinPeaks"].name,
          });
        }
        // Compute totals per category for synergyOnline (≥25 total levels in each tree)
        const totals = { active: 0, idle: 0, efficiency: 0 } as Record<"active" | "idle" | "efficiency", number>;
        Object.entries(derived.upgrades || {}).forEach(([id, lvl]) => {
          const u = UPGRADES[id as keyof typeof UPGRADES];
          if (u) totals[u.category] += Number(lvl || 0);
        });
        if (totals.active >= 25 && totals.idle >= 25 && totals.efficiency >= 25 && !achvNext["synergyOnline"]) {
          achvNext["synergyOnline"] = { unlocked: true, unlockedAt: Date.now() };
          showToast({
            style: Toast.Style.Success,
            title: "Achievement Unlocked!",
            message: ACHIEVEMENTS["synergyOnline"].name,
          });
        }
        if (categoriesReached >= 3 && !achvNext["milestoneTrifecta"]) {
          achvNext["milestoneTrifecta"] = { unlocked: true, unlockedAt: Date.now() };
          showToast({
            style: Toast.Style.Success,
            title: "Achievement Unlocked!",
            message: ACHIEVEMENTS["milestoneTrifecta"].name,
          });
        }

        derived = { ...derived, achievements: achvNext };
        void saveGameState(derived);
        return derived;
      });

      return bought;
    },
    [getCostReductionFactor, calculateDerivedState],
  );

  // Handle prestige action
  const prestige = useCallback(() => {
    setGameState((prev) => {
      const gained = calculatePrestigePoints(prev.prestige.totalEarned || 0, PRESTIGE_PP_DIVISOR);
      if (gained <= 0) {
        showToast({ style: Toast.Style.Failure, title: "Not enough to prestige" });
        return prev;
      }

      // Base reset
      let nextCurrency = 0;
      // Apply Quick Start bonus
      const quickStart = prev.prestige.upgrades["quickStart"] || 0;
      nextCurrency += 50 * quickStart;

      // Apply Second Wind starting levels
      const secondWind = prev.prestige.upgrades["secondWind"] || 0;
      const nextUpgrades: GameState["upgrades"] = {};
      if (secondWind > 0) {
        Object.keys(UPGRADES).forEach((id) => {
          nextUpgrades[id] = secondWind;
        });
      }
      // Recompute milestone bonuses for starting levels
      const nextMilestones: GameState["milestoneBonuses"] = {};
      Object.entries(nextUpgrades).forEach(([id, lvl]) => {
        const def = UPGRADES[id as keyof typeof UPGRADES];
        nextMilestones[id] = getMilestoneBonus(def, lvl);
      });

      const newState: GameState = calculateDerivedState({
        ...INITIAL_STATE,
        currency: nextCurrency,
        prestige: {
          ...prev.prestige,
          level: prev.prestige.level + 1,
          prestigePoints: prev.prestige.prestigePoints + gained,
          totalEarned: 0,
          lifetimeEarned: prev.prestige.lifetimeEarned,
        },
        upgrades: nextUpgrades,
        milestoneBonuses: nextMilestones,
        lastUpdate: Date.now(),
      });

      // Preserve achievements across prestige and unlock Fresh Start Pro if applicable
      const achievements = { ...(prev.achievements || {}) } as NonNullable<GameState["achievements"]>;
      if (prev.prestige.level === 0 && gained >= 10 && !achievements["freshStartPro"]) {
        achievements["freshStartPro"] = { unlocked: true, unlockedAt: Date.now() };
        showToast({
          style: Toast.Style.Success,
          title: "Achievement Unlocked!",
          message: ACHIEVEMENTS["freshStartPro"].name,
        });
      }
      newState.achievements = achievements;

      void saveGameState(newState);

      showToast({
        style: Toast.Style.Success,
        title: "Prestige Complete!",
        message: `Gained ${gained} prestige point${gained === 1 ? "" : "s"}!`,
      });

      return newState;
    });
  }, [calculateDerivedState]);

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

  // Handle prestige upgrade purchase (atomic inside updater to avoid race conditions)
  const purchasePrestigeUpgrade = useCallback(
    (upgradeId: string) => {
      const upgrade = PRESTIGE_UPGRADES[upgradeId];
      if (!upgrade) return false;

      let purchased = false;

      setGameState((prev) => {
        const currentLevelPrev = prev.prestige.upgrades[upgradeId] || 0;

        // Already maxed
        if (currentLevelPrev >= upgrade.maxLevel) {
          showToast({
            style: Toast.Style.Failure,
            title: "Maximum level reached",
            message: `${upgrade.name} is already at maximum level`,
          });
          return prev;
        }

        const costPrev = calculatePrestigeUpgradeCost(upgrade, currentLevelPrev);

        // Affordability check against CURRENT state inside updater
        if (prev.prestige.prestigePoints < costPrev) {
          showToast({
            style: Toast.Style.Failure,
            title: "Not enough prestige points",
            message: `You need ${costPrev - prev.prestige.prestigePoints} more prestige points`,
          });
          return prev;
        }

        // Perform purchase
        const newPrestigeUpgrades = { ...prev.prestige.upgrades, [upgradeId]: currentLevelPrev + 1 };
        const newState: GameState = {
          ...prev,
          prestige: {
            ...prev.prestige,
            prestigePoints: prev.prestige.prestigePoints - costPrev,
            upgrades: newPrestigeUpgrades,
          },
        };

        // Apply special effects based on the upgrade
        if (upgradeId === "bulkBuyerPro") {
          newState.settings = { ...newState.settings, bulkBuyEnabled: true };
        } else if (upgradeId === "fasterTick") {
          newState.settings = { ...newState.settings, offlineProgressEnabled: true };
        }

        purchased = true;

        // Persist immediately so prestige upgrades and setting toggles aren't lost
        void saveGameState(newState);

        showToast({
          style: Toast.Style.Success,
          title: `${upgrade.name} Purchased!`,
          message: `Level ${currentLevelPrev + 1}/${upgrade.maxLevel}`,
        });

        return calculateDerivedState(newState);
      });

      return purchased;
    },
    [calculateDerivedState],
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
