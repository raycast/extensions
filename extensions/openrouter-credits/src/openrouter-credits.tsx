import {
  Color,
  getPreferenceValues,
  launchCommand,
  LaunchType,
  LocalStorage,
  MenuBarExtra,
  open,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { createHash } from "crypto";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CreditsData,
  fetchCredits as fetchOpenRouterCredits,
  formatCurrency,
  isCreditsData,
} from "./openrouter";

const CACHE_KEY = "openrouter_credits";
const DEFAULT_LOW_BALANCE_THRESHOLD = 5;
const LOW_BALANCE_NOTIFICATION_KEY = "openrouter_low_balance_notification";

interface CachedCredits {
  data: CreditsData;
  apiKeyHash: string;
}

function parseLowBalanceThreshold(value: string | undefined): number | null {
  const input = value?.trim() || String(DEFAULT_LOW_BALANCE_THRESHOLD);

  const threshold = Number(input);
  return Number.isFinite(threshold) && threshold >= 0 ? threshold : null;
}

function hashApiKey(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex");
}

function parseCachedCredits(
  value: string | undefined,
  apiKeyHash: string,
): CreditsData | null {
  if (!value) return null;

  try {
    const parsed: unknown = JSON.parse(value);

    if (
      parsed &&
      typeof parsed === "object" &&
      isCreditsData((parsed as CachedCredits).data) &&
      (parsed as CachedCredits).apiKeyHash === apiKeyHash
    ) {
      return (parsed as CachedCredits).data;
    }
  } catch {
    // Ignore invalid cached data and retrieve a fresh balance instead.
  }

  return null;
}

export default function Command() {
  const [credits, setCredits] = useState<CreditsData | null>(null);
  const [isCacheLoaded, setIsCacheLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lowBalanceNotification = useRef({
    isProcessing: false,
    pendingRemaining: null as number | null,
  });
  const requestId = useRef(0);
  const { apiKey, lowBalanceNotifications, lowBalanceThreshold } =
    getPreferenceValues<Preferences>();
  const alertThreshold = parseLowBalanceThreshold(lowBalanceThreshold);
  const alertsEnabled = lowBalanceNotifications !== false;
  const needsApiKey = !apiKey;

  useEffect(() => {
    requestId.current += 1;
    setCredits(null);
    setError(null);
    setIsCacheLoaded(false);

    if (!apiKey) {
      void LocalStorage.removeItem(CACHE_KEY).finally(() => {
        setIsCacheLoaded(true);
      });
      return;
    }

    let cancelled = false;
    const apiKeyHash = hashApiKey(apiKey);

    void LocalStorage.getItem<string>(CACHE_KEY)
      .then((cached) => {
        const cachedCredits = parseCachedCredits(cached, apiKeyHash);
        if (!cancelled && cachedCredits) setCredits(cachedCredits);
      })
      .catch(() => {
        // A cache failure should never prevent a live API request.
      })
      .finally(() => {
        if (!cancelled) setIsCacheLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  const updateLowBalanceNotification = useCallback(
    async (remaining: number) => {
      const notification = lowBalanceNotification.current;
      notification.pendingRemaining = remaining;
      if (notification.isProcessing) return;

      notification.isProcessing = true;

      try {
        while (notification.pendingRemaining !== null) {
          const latestRemaining = notification.pendingRemaining;
          notification.pendingRemaining = null;

          if (
            !alertsEnabled ||
            alertThreshold === null ||
            latestRemaining > alertThreshold
          ) {
            await LocalStorage.removeItem(LOW_BALANCE_NOTIFICATION_KEY);
            continue;
          }

          const notificationThreshold = formatCurrency(alertThreshold);
          const notifiedAtThreshold = await LocalStorage.getItem<string>(
            LOW_BALANCE_NOTIFICATION_KEY,
          );

          // Process a newer refresh instead of presenting an obsolete alert.
          if (notification.pendingRemaining !== null) continue;
          if (notifiedAtThreshold === notificationThreshold) continue;

          await LocalStorage.setItem(
            LOW_BALANCE_NOTIFICATION_KEY,
            notificationThreshold,
          );

          if (notification.pendingRemaining !== null) continue;

          await showToast({
            style: Toast.Style.Failure,
            title: "OpenRouter balance is low",
            message: `${formatCurrency(latestRemaining)} remaining (alert at ${notificationThreshold})`,
          });
        }
      } catch {
        // A notification failure must not affect balance updates.
      } finally {
        notification.isProcessing = false;
      }
    },
    [alertThreshold, alertsEnabled],
  );

  const fetchCredits = useCallback(async () => {
    if (!apiKey) {
      setCredits(null);
      setError("Management API key not configured");
      setIsLoading(false);
      return;
    }

    const currentRequestId = ++requestId.current;
    setIsLoading(true);

    try {
      const updatedCredits = await fetchOpenRouterCredits(apiKey);
      if (currentRequestId !== requestId.current) return;

      setCredits(updatedCredits);
      setError(null);
      void LocalStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          data: updatedCredits,
          apiKeyHash: hashApiKey(apiKey),
        }),
      );
      void updateLowBalanceNotification(
        updatedCredits.total_credits - updatedCredits.total_usage,
      );
    } catch (error) {
      if (currentRequestId !== requestId.current) return;

      setCredits(null);
      void LocalStorage.removeItem(CACHE_KEY);
      setError(
        error instanceof Error ? error.message : "Couldn't fetch balance",
      );
    } finally {
      if (currentRequestId === requestId.current) setIsLoading(false);
    }
  }, [apiKey, updateLowBalanceNotification]);

  useEffect(() => {
    if (isCacheLoaded) void fetchCredits();
  }, [fetchCredits, isCacheLoaded]);

  const remaining = credits
    ? credits.total_credits - credits.total_usage
    : null;
  const title = remaining === null ? "--" : formatCurrency(remaining);
  const tooltip = error
    ? `OpenRouter Credits: ${error}`
    : remaining === null
      ? "OpenRouter Credits"
      : `OpenRouter Credits: ${formatCurrency(remaining)} remaining`;

  async function openDashboard(): Promise<void> {
    await launchCommand({
      name: "openrouter-credit-dashboard",
      type: LaunchType.UserInitiated,
    });
  }

  return (
    <MenuBarExtra
      icon={{ source: "openrouter-mark.svg", tintColor: Color.PrimaryText }}
      title={title}
      tooltip={tooltip}
      isLoading={isLoading}
    >
      {credits && remaining !== null ? (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title="View Balance Dashboard"
            subtitle={`${formatCurrency(remaining)} available`}
            onAction={() => void openDashboard()}
          />
        </MenuBarExtra.Section>
      ) : null}

      {error ? (
        <MenuBarExtra.Section title="Status">
          <MenuBarExtra.Item title={`Couldn't update balance: ${error}`} />
        </MenuBarExtra.Section>
      ) : null}

      {needsApiKey ? (
        <MenuBarExtra.Section title="Set Up">
          <MenuBarExtra.Item
            title="1. Get Management API Key"
            onAction={() =>
              open("https://openrouter.ai/settings/management-keys")
            }
          />
          <MenuBarExtra.Item
            title="2. Paste Management API Key..."
            onAction={() => void openExtensionPreferences()}
          />
        </MenuBarExtra.Section>
      ) : (
        <MenuBarExtra.Section>
          {alertsEnabled && alertThreshold !== null ? (
            <MenuBarExtra.Item
              title="Low-Balance Alert"
              subtitle={`At or below ${formatCurrency(alertThreshold)}`}
            />
          ) : (
            <MenuBarExtra.Item title="Low-Balance Alerts Disabled" />
          )}
          <MenuBarExtra.Item
            title="Refresh"
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={() => void fetchCredits()}
          />
          <MenuBarExtra.Item
            title="Open OpenRouter"
            onAction={() => open("https://openrouter.ai")}
          />
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section>
        {!needsApiKey ? (
          <MenuBarExtra.Item
            title="Preferences"
            onAction={() => void openExtensionPreferences()}
          />
        ) : null}
        <MenuBarExtra.Item
          title="View Source Code"
          onAction={() => open("https://github.com/cyprusad/openrouter-widget")}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
