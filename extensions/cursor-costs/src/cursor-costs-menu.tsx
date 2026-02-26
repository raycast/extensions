import { useMemo } from "react";
import { Icon, MenuBarExtra, open, openExtensionPreferences, Keyboard, getPreferenceValues } from "@raycast/api";
import { useCursorUsage } from "./hooks/useCursorUsage";
import {
  formatCents,
  getProgressIcon,
  calculatePercentage,
  formatTokens,
  formatTokensFull,
  sortModelsByCost,
  formatDateRange,
  formatUsagePercent,
  formatUsageFraction,
  formatRemainingCents,
  calculateTotalTokens,
  getMenuBarTitle,
} from "./utils/formatting";
import type { MenuBarPreferences, ModelAggregation } from "./types";

export default function Command() {
  const { data, error, isLoading, refresh } = useCursorUsage();
  const preferences = getPreferenceValues<MenuBarPreferences>();

  // Token formatter based on preferences
  const fmtTokens = (tokens: string | number | null | undefined): string => {
    return preferences.tokenFormat === "full" ? formatTokensFull(tokens) : formatTokens(tokens);
  };

  // Memoized calculations for better performance
  const menuBarData = useMemo(() => {
    // Show error indicator in menu bar title
    if (error) {
      return { titleText: "⚠", hasData: false, hasError: true, icon: Icon.ExclamationMark };
    }
    if (!data) return { titleText: "", hasData: false, hasError: false, icon: Icon.Clock };

    const planUsage = data.summary?.individualUsage?.plan ?? null;
    const titleText = getMenuBarTitle(data.usage.totalCostCents, planUsage, preferences.menuBarDisplay);
    const hasData = data.usage.aggregations && data.usage.aggregations.length > 0;

    // Determine icon based on settings
    let icon: Icon | { light: string; dark: string };
    if (preferences.menuBarIcon === "progress" && planUsage?.enabled) {
      const percent = calculatePercentage(planUsage.used + (planUsage.breakdown?.bonus ?? 0), planUsage.limit);
      icon = getProgressIcon(percent);
    } else {
      icon = { light: "cursor_logo.svg", dark: "cursor_logo@dark.svg" };
    }

    return { titleText, hasData, hasError: false, icon };
  }, [data, error, preferences.menuBarDisplay, preferences.menuBarIcon]);

  // Memoized sorted models
  const sortedModels = useMemo(() => {
    return sortModelsByCost(data?.usage?.aggregations);
  }, [data?.usage?.aggregations]);

  // Build model title based on preferences
  // Order: name → percent → tokens → cost
  const buildModelTitle = (model: ModelAggregation, percentage: number, totalTokens: number): string => {
    const displayOption = preferences.modelInfoDisplay ?? "both";
    const showPercent = preferences.showModelPercent !== false;

    const parts: string[] = [model.modelIntent];

    if (showPercent) {
      parts.push(`${percentage.toFixed(1)}%`);
    }
    if (displayOption === "tokens" || displayOption === "both") {
      parts.push(fmtTokens(totalTokens));
    }
    if (displayOption === "cost" || displayOption === "both") {
      parts.push(formatCents(model.totalCents, "menu-bar"));
    }

    return parts.join(" • ");
  };

  // Render token details submenu for a model
  const renderModelSubmenu = (model: ModelAggregation, index: number) => {
    const percentage = calculatePercentage(model.totalCents, data?.usage.totalCostCents);
    const totalTokens = calculateTotalTokens(model);
    const title = buildModelTitle(model, percentage, totalTokens);

    return (
      <MenuBarExtra.Submenu key={`${model.modelIntent}-${index}`} title={title} icon={getProgressIcon(percentage)}>
        <MenuBarExtra.Item icon={Icon.BankNote} title="Cost" subtitle={formatCents(model.totalCents, "menu-bar")} />
        <MenuBarExtra.Item icon={Icon.PieChart} title="Share" subtitle={`${percentage.toFixed(1)}%`} />
        <MenuBarExtra.Section title="Tokens">
          <MenuBarExtra.Item icon={Icon.Download} title="Cache Read" subtitle={fmtTokens(model.cacheReadTokens)} />
          <MenuBarExtra.Item icon={Icon.Upload} title="Cache Write" subtitle={fmtTokens(model.cacheWriteTokens)} />
          <MenuBarExtra.Item icon={Icon.ArrowUp} title="Input" subtitle={fmtTokens(model.inputTokens)} />
          <MenuBarExtra.Item icon={Icon.ArrowDown} title="Output" subtitle={fmtTokens(model.outputTokens)} />
        </MenuBarExtra.Section>
        <MenuBarExtra.Section>
          <MenuBarExtra.Item icon={Icon.Document} title="Total" subtitle={fmtTokens(totalTokens)} />
        </MenuBarExtra.Section>
      </MenuBarExtra.Submenu>
    );
  };

  const renderContent = () => {
    if (error) {
      const isAuthError = error.message.includes("token") || error.message.includes("Authentication");
      return (
        <>
          <MenuBarExtra.Item
            icon={Icon.ExclamationMark}
            title={isAuthError ? "Token expired or invalid" : "Failed to load data"}
            subtitle={error.message.length > 50 ? `${error.message.substring(0, 47)}...` : error.message}
          />
          <MenuBarExtra.Section>
            <MenuBarExtra.Item
              icon={Icon.RotateClockwise}
              title="Retry"
              onAction={refresh}
              shortcut={Keyboard.Shortcut.Common.Refresh}
            />
            <MenuBarExtra.Item
              icon={Icon.Key}
              title="Get New Token (Open Cursor Dashboard)"
              onAction={() => {
                void open("https://cursor.com/dashboard");
              }}
            />
            <MenuBarExtra.Item
              icon={Icon.Gear}
              title="Update Token in Settings"
              onAction={() => {
                void openExtensionPreferences();
              }}
              shortcut={Keyboard.Shortcut.Common.Open}
            />
          </MenuBarExtra.Section>
        </>
      );
    }

    if (data && menuBarData.hasData) {
      const usage = data.usage;
      const summary = data.summary;
      const planUsage = summary?.individualUsage?.plan;

      // Calculate total tokens
      const totalTokensSum =
        (Number.parseInt(usage.totalInputTokens || "0", 10) || 0) +
        (Number.parseInt(usage.totalOutputTokens || "0", 10) || 0) +
        (Number.parseInt(usage.totalCacheWriteTokens || "0", 10) || 0) +
        (Number.parseInt(usage.totalCacheReadTokens || "0", 10) || 0);

      return (
        <>
          {/* Subscription section */}
          {preferences.showSubscriptionSection !== false && summary && (
            <MenuBarExtra.Section title="Subscription">
              <MenuBarExtra.Item
                icon={Icon.Calendar}
                title="Period"
                subtitle={formatDateRange(summary.billingCycleStart, summary.billingCycleEnd)}
                onAction={() => {
                  void open("https://cursor.com/dashboard?tab=billing");
                }}
              />
              <MenuBarExtra.Item
                icon={Icon.Person}
                title="Plan"
                subtitle={summary.membershipType.charAt(0).toUpperCase() + summary.membershipType.slice(1)}
                onAction={() => {
                  void open("https://cursor.com/dashboard?tab=overview");
                }}
              />
              {planUsage?.enabled && (
                <>
                  <MenuBarExtra.Item
                    icon={getProgressIcon(
                      calculatePercentage(planUsage.used + planUsage.breakdown.bonus, planUsage.limit),
                    )}
                    title="Usage"
                    subtitle={`${formatUsageFraction(planUsage.used, planUsage.limit, planUsage.breakdown.bonus)} (${formatUsagePercent(planUsage.used, planUsage.limit, planUsage.breakdown.bonus)}) • ${formatRemainingCents(planUsage.remaining)} left`}
                    onAction={() => {
                      void open("https://cursor.com/dashboard?tab=usage");
                    }}
                  />
                  {planUsage.breakdown.bonus > 0 && (
                    <MenuBarExtra.Item
                      icon={Icon.Gift}
                      title="Bonus"
                      subtitle={formatCents(planUsage.breakdown.bonus, "menu-bar")}
                      onAction={() => {
                        void open("https://cursor.com/dashboard?tab=usage");
                      }}
                    />
                  )}
                </>
              )}
            </MenuBarExtra.Section>
          )}

          {/* Cost section with submenu */}
          {preferences.showCostSection !== false && (
            <MenuBarExtra.Section title="Cost">
              <MenuBarExtra.Submenu
                icon={Icon.BankNote}
                title={`Total: ${formatCents(usage.totalCostCents, "menu-bar")}`}
              >
                <MenuBarExtra.Item
                  icon={Icon.BankNote}
                  title="Total Cost"
                  subtitle={formatCents(usage.totalCostCents, "menu-bar")}
                />
                {planUsage?.enabled && planUsage.breakdown.bonus > 0 && (
                  <MenuBarExtra.Item
                    icon={Icon.Gift}
                    title="Bonus"
                    subtitle={formatCents(planUsage.breakdown.bonus, "menu-bar")}
                  />
                )}
                {planUsage?.enabled && (usage.totalCostCents ?? 0) - planUsage.breakdown.total > 0 && (
                  <MenuBarExtra.Item
                    icon={Icon.Stars}
                    title="Free"
                    subtitle={formatCents((usage.totalCostCents ?? 0) - planUsage.breakdown.total, "menu-bar")}
                  />
                )}
                <MenuBarExtra.Section title="Tokens">
                  <MenuBarExtra.Item
                    icon={Icon.Download}
                    title="Cache Read"
                    subtitle={fmtTokens(usage.totalCacheReadTokens)}
                  />
                  <MenuBarExtra.Item
                    icon={Icon.Upload}
                    title="Cache Write"
                    subtitle={fmtTokens(usage.totalCacheWriteTokens)}
                  />
                  <MenuBarExtra.Item icon={Icon.ArrowUp} title="Input" subtitle={fmtTokens(usage.totalInputTokens)} />
                  <MenuBarExtra.Item
                    icon={Icon.ArrowDown}
                    title="Output"
                    subtitle={fmtTokens(usage.totalOutputTokens)}
                  />
                </MenuBarExtra.Section>
                <MenuBarExtra.Section>
                  <MenuBarExtra.Item icon={Icon.Document} title="Total" subtitle={fmtTokens(totalTokensSum)} />
                </MenuBarExtra.Section>
              </MenuBarExtra.Submenu>
            </MenuBarExtra.Section>
          )}

          {/* Models section with submenus */}
          {preferences.showModelsSection !== false && (
            <MenuBarExtra.Section title={`Models (${sortedModels.length})`}>
              {sortedModels.map((model, index) => renderModelSubmenu(model, index))}
            </MenuBarExtra.Section>
          )}

          {/* Tokens section (optional) */}
          {preferences.showTokensSection && (
            <MenuBarExtra.Section title="Tokens">
              <MenuBarExtra.Item
                icon={Icon.Download}
                title="Cache Read"
                subtitle={fmtTokens(usage.totalCacheReadTokens)}
                onAction={() => void open("https://cursor.com/dashboard?tab=billing")}
              />
              <MenuBarExtra.Item
                icon={Icon.Upload}
                title="Cache Write"
                subtitle={fmtTokens(usage.totalCacheWriteTokens)}
                onAction={() => void open("https://cursor.com/dashboard?tab=billing")}
              />
              <MenuBarExtra.Item
                icon={Icon.ArrowUp}
                title="Input"
                subtitle={fmtTokens(usage.totalInputTokens)}
                onAction={() => void open("https://cursor.com/dashboard?tab=billing")}
              />
              <MenuBarExtra.Item
                icon={Icon.ArrowDown}
                title="Output"
                subtitle={fmtTokens(usage.totalOutputTokens)}
                onAction={() => void open("https://cursor.com/dashboard?tab=billing")}
              />
              <MenuBarExtra.Item
                icon={Icon.Document}
                title="Total"
                subtitle={fmtTokens(totalTokensSum)}
                onAction={() => void open("https://cursor.com/dashboard?tab=billing")}
              />
            </MenuBarExtra.Section>
          )}

          {/* Quick actions */}
          <MenuBarExtra.Section>
            {preferences.showRefreshButton && (
              <MenuBarExtra.Item
                icon={Icon.RotateClockwise}
                title="Refresh"
                onAction={refresh}
                shortcut={Keyboard.Shortcut.Common.Refresh}
              />
            )}
            <MenuBarExtra.Item
              icon={Icon.Globe}
              title="Open Dashboard"
              onAction={() => {
                void open("https://cursor.com/dashboard?tab=usage");
              }}
              shortcut={Keyboard.Shortcut.Common.Open}
            />
            {preferences.showSettingsButton && (
              <MenuBarExtra.Item
                icon={Icon.Gear}
                title="Preferences"
                onAction={() => {
                  void openExtensionPreferences();
                }}
                shortcut={Keyboard.Shortcut.Common.OpenWith}
              />
            )}
          </MenuBarExtra.Section>
        </>
      );
    }

    if (data && !menuBarData.hasData) {
      const summary = data.summary;
      const planUsage = summary?.individualUsage?.plan;

      return (
        <>
          {preferences.showSubscriptionSection !== false && summary && (
            <MenuBarExtra.Section title="Subscription">
              <MenuBarExtra.Item
                icon={Icon.Calendar}
                title="Period"
                subtitle={formatDateRange(summary.billingCycleStart, summary.billingCycleEnd)}
                onAction={() => {
                  void open("https://cursor.com/dashboard?tab=billing");
                }}
              />
              <MenuBarExtra.Item
                icon={Icon.Person}
                title="Plan"
                subtitle={summary.membershipType.charAt(0).toUpperCase() + summary.membershipType.slice(1)}
                onAction={() => {
                  void open("https://cursor.com/dashboard?tab=overview");
                }}
              />
              {planUsage?.enabled && planUsage.breakdown.bonus > 0 && (
                <MenuBarExtra.Item
                  icon={Icon.Gift}
                  title="Bonus"
                  subtitle={formatCents(planUsage.breakdown.bonus, "menu-bar")}
                />
              )}
            </MenuBarExtra.Section>
          )}
          <MenuBarExtra.Item icon={Icon.CheckCircle} title="No usage data" subtitle="No costs recorded this period" />
          <MenuBarExtra.Section>
            {preferences.showRefreshButton && (
              <MenuBarExtra.Item
                icon={Icon.RotateClockwise}
                title="Refresh"
                onAction={refresh}
                shortcut={Keyboard.Shortcut.Common.Refresh}
              />
            )}
            <MenuBarExtra.Item
              icon={Icon.Globe}
              title="Open Dashboard"
              onAction={() => {
                void open("https://cursor.com/dashboard?tab=usage");
              }}
              shortcut={Keyboard.Shortcut.Common.Open}
            />
          </MenuBarExtra.Section>
        </>
      );
    }

    return <MenuBarExtra.Item title="Loading..." icon={Icon.Clock} />;
  };

  // Generate tooltip
  const tooltip = useMemo(() => {
    if (!data) return "Cursor Costs";

    const cost = formatCents(data.usage.totalCostCents, "title");
    const planUsage = data.summary?.individualUsage?.plan;

    if (planUsage?.enabled) {
      const percent = formatUsagePercent(planUsage.used, planUsage.limit, planUsage.breakdown?.bonus);
      return `Cursor Costs • ${cost} • ${percent} used`;
    }

    return `Cursor Costs • ${cost}`;
  }, [data]);

  // Determine icon prop
  const iconProp = useMemo(() => {
    if (typeof menuBarData.icon === "object" && "light" in menuBarData.icon) {
      return { source: menuBarData.icon };
    }
    return { source: menuBarData.icon };
  }, [menuBarData.icon]);

  return (
    <MenuBarExtra icon={iconProp} title={menuBarData.titleText} isLoading={isLoading} tooltip={tooltip}>
      {renderContent()}
    </MenuBarExtra>
  );
}
