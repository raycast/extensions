/**
 * FIRE command — entry point for the Financial Independence, Retire Early dashboard.
 *
 * This is a thin wiring layer that connects:
 * - `useFireSettings` hook (FIRE configuration CRUD via LocalStorage)
 * - `usePortfolio` hook (read-only access to portfolio data)
 * - `usePortfolioValue` hook (live valuation for current portfolio total)
 * - `FireSetup` component (onboarding / edit settings form)
 * - `FireContributions` component (manage recurring contributions)
 * - `FireDashboard` component (projection chart + key metrics)
 *
 * Flow:
 * 1. Load FIRE settings and portfolio data in parallel
 * 2. If no FIRE settings exist → render FireSetup (onboarding)
 * 3. On setup submit → transition to FireContributions ("Configure Contributions")
 * 4. On contributions done → transition to FireDashboard ("Show Projection")
 * 5. If settings already exist on launch → render FireDashboard directly
 *
 * The onboarding flow uses single-frame rendering with a phase state to keep
 * the navigation stack stable: setup → contributions → dashboard, all within
 * the same root component. Subsequent launches skip straight to dashboard.
 *
 * Design principle: this file contains NO rendering logic or business logic.
 * It only wires hooks to components and manages phase transitions.
 *
 * The FIRE feature reads portfolio data but never modifies it. FIRE settings
 * are stored under a separate LocalStorage key (`fire-settings`).
 */

import React from "react";
import { useState, useCallback } from "react";
import { Detail } from "@raycast/api";
import { useFireSettings } from "./hooks/useFireSettings";
import { usePortfolio } from "./hooks/usePortfolio";
import { usePortfolioValue } from "./hooks/usePortfolioValue";
import { FireSetup } from "./components/FireSetup";
import { FireDashboard } from "./components/FireDashboard";
import { FireContributions } from "./components/FireContributions";
import { FireSettings, FireContribution } from "./utils/fire-types";

// ──────────────────────────────────────────
// Onboarding Phase
// ──────────────────────────────────────────

/**
 * Phase state for the first-time onboarding flow.
 *
 * - "idle"          → no setup has started yet (show FireSetup or FireDashboard)
 * - "contributions" → setup just completed, now configuring contributions
 * - "done"          → contributions configured, show FireDashboard
 */
type OnboardingPhase = "idle" | "contributions" | "done";

// ──────────────────────────────────────────
// Command Component
// ──────────────────────────────────────────

export default function FireCommand(): React.JSX.Element {
  // ── Data Hooks ──

  const {
    settings,
    isLoading: isSettingsLoading,
    revalidate: revalidateSettings,
    save: saveSettings,
    clear: clearSettings,
  } = useFireSettings();

  const { portfolio, isLoading: isPortfolioLoading } = usePortfolio();

  const { valuation, isLoading: isValuationLoading, baseCurrency } = usePortfolioValue(portfolio);

  // ── Derived State ──

  const isLoading = isSettingsLoading || isPortfolioLoading || isValuationLoading;
  const accounts = portfolio?.accounts ?? [];
  const hasSettings = settings !== null && settings !== undefined;

  // ── Onboarding phase state ──
  // Tracks the user's progression through the first-time setup flow:
  //   FireSetup ("Configure Contributions") → FireContributions ("Show Projection") → FireDashboard

  const [onboardingPhase, setOnboardingPhase] = useState<OnboardingPhase>("idle");

  // ── Callbacks ──

  /**
   * Handle initial setup save: persist settings and transition to contributions phase.
   * The user just completed the setup form — next step is configuring contributions
   * before seeing the dashboard for the first time.
   */
  const handleSetupSave = useCallback(
    async (newSettings: FireSettings): Promise<void> => {
      await saveSettings(newSettings);
      setOnboardingPhase("contributions");
    },
    [saveSettings],
  );

  /**
   * Handle "Show Projection" from the onboarding contributions phase.
   * Transitions to the dashboard view.
   */
  const handleOnboardingContributionsDone = useCallback((): void => {
    revalidateSettings();
    setOnboardingPhase("done");
  }, [revalidateSettings]);

  /**
   * Handle settings save from the dashboard's edit flow.
   * The FireDashboard's pushed FireSetup handles pop() internally.
   */
  const handleDashboardSaveSettings = useCallback(
    async (newSettings: FireSettings): Promise<void> => {
      await saveSettings(newSettings);
    },
    [saveSettings],
  );

  /**
   * Handle contribution updates from FireContributions.
   * Merges the updated contributions array into the current settings.
   */
  const handleSaveContributions = useCallback(
    async (contributions: FireContribution[]): Promise<void> => {
      if (!settings) return;
      await saveSettings({
        ...settings,
        contributions,
      });
    },
    [settings, saveSettings],
  );

  /**
   * Handle settings reset — clears all FIRE data and returns to setup.
   */
  const handleClearSettings = useCallback(async (): Promise<void> => {
    await clearSettings();
    setOnboardingPhase("idle");
  }, [clearSettings]);

  // ── Compute current portfolio value for context display ──

  const currentPortfolioValue = valuation?.totalValue ?? 0;

  // ── Included accounts for contributions phase ──

  const includedAccounts = accounts.filter((a) => !(settings?.excludedAccountIds ?? []).includes(a.id));

  // ── Loading State ──
  // Show a loading spinner while initial data is being fetched.

  if (isLoading && !hasSettings && onboardingPhase === "idle") {
    return <Detail isLoading markdown="" />;
  }

  // ── Setup Phase ──
  // Show the onboarding form when no FIRE settings have been saved yet
  // and the user hasn't progressed past setup in this session.

  if (!hasSettings && onboardingPhase === "idle") {
    return (
      <FireSetup
        accounts={accounts}
        currentPortfolioValue={currentPortfolioValue}
        baseCurrency={baseCurrency}
        onSave={handleSetupSave}
      />
    );
  }

  // ── Contributions Phase (onboarding only) ──
  // After completing setup, the user configures contributions before
  // seeing the dashboard for the first time. This uses single-frame
  // rendering — the contributions component is rendered inline (not pushed)
  // so the nav stack stays stable.

  if (onboardingPhase === "contributions") {
    return (
      <FireContributions
        contributions={settings?.contributions ?? []}
        accounts={includedAccounts}
        baseCurrency={baseCurrency}
        onSave={handleSaveContributions}
        onDone={handleOnboardingContributionsDone}
        doneTitle="Show Projection"
      />
    );
  }

  // ── Dashboard Phase ──
  // Settings exist (either loaded from storage or just saved during onboarding).

  if (settings) {
    return (
      <FireDashboard
        settings={settings}
        portfolio={portfolio}
        valuation={valuation}
        baseCurrency={baseCurrency}
        onSaveSettings={handleDashboardSaveSettings}
        onSaveContributions={handleSaveContributions}
        onClearSettings={handleClearSettings}
        revalidateSettings={revalidateSettings}
      />
    );
  }

  // ── Fallback ──
  // This should only show briefly after onboarding completion while
  // the settings hook revalidates from storage.

  return <Detail isLoading markdown="*Loading FIRE dashboard...*" />;
}
