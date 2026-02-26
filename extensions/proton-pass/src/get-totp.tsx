import { List, ActionPanel, Action, Icon, showToast, Toast, Clipboard, Color, getPreferenceValues } from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import { listItems, getTotp, checkAuth } from "./lib/pass-cli";
import { Item, PassCliError, PassCliErrorType } from "./lib/types";
import { getItemIcon, getTotpRemainingSeconds, formatTotpCode } from "./lib/utils";
import { getCachedItems, setCachedItems } from "./lib/cache";
import { renderErrorView } from "./lib/error-views";

interface TotpItem extends Item {
  currentTotp?: string;
}

function getTotpTimeStep(): number {
  return Math.floor(Date.now() / 30_000);
}

export default function Command() {
  const preferences = getPreferenceValues();
  const [items, setItems] = useState<TotpItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(getTotpRemainingSeconds());
  const [error, setError] = useState<PassCliErrorType | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const itemsRef = useRef<TotpItem[]>([]);
  const currentTimeStepRef = useRef<number>(getTotpTimeStep());
  const isRefreshingRef = useRef(false);

  useEffect(() => {
    loadTotpItems();

    intervalRef.current = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      setRemainingSeconds(30 - (now % 30));

      const nextTimeStep = getTotpTimeStep();
      if (nextTimeStep !== currentTimeStepRef.current) {
        currentTimeStepRef.current = nextTimeStep;
        refreshTotpCodes();
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  async function loadTotpItems() {
    setError(null);

    const cachedItems = await getCachedItems();
    if (cachedItems) {
      const cachedTotpItems = cachedItems.filter((item) => item.hasTotp);
      if (cachedTotpItems.length > 0) {
        const itemsWithPlaceholder = cachedTotpItems.map((item) => ({
          ...item,
          currentTotp: undefined,
        }));
        setItems(itemsWithPlaceholder);
        itemsRef.current = itemsWithPlaceholder;
        setIsLoading(false);

        const itemsWithTotp = await Promise.all(
          cachedTotpItems.map(async (item) => {
            try {
              const totp = await getTotp(item.shareId, item.itemId);
              return { ...item, currentTotp: totp };
            } catch {
              return { ...item, currentTotp: undefined };
            }
          }),
        );
        setItems(itemsWithTotp);
        itemsRef.current = itemsWithTotp;
      }
    }

    try {
      const isAuth = await checkAuth();
      if (!isAuth) {
        setError("not_authenticated");
        setIsLoading(false);
        return;
      }

      const freshItems = await listItems();
      await setCachedItems(freshItems);

      const totpItems = freshItems.filter((item) => item.hasTotp);
      const itemsWithTotp = await Promise.all(
        totpItems.map(async (item) => {
          try {
            const totp = await getTotp(item.shareId, item.itemId);
            return { ...item, currentTotp: totp };
          } catch {
            return { ...item, currentTotp: undefined };
          }
        }),
      );

      setItems(itemsWithTotp);
      itemsRef.current = itemsWithTotp;
    } catch (e: unknown) {
      if (!cachedItems) {
        if (e instanceof PassCliError) {
          setError(e.type);
        } else {
          setError("unknown");
        }
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshTotpCodes() {
    if (isRefreshingRef.current) return;

    isRefreshingRef.current = true;
    setIsRefreshing(true);
    try {
      const currentItems = itemsRef.current;
      const updatedItems = await Promise.all(
        currentItems.map(async (item) => {
          try {
            const totp = await getTotp(item.shareId, item.itemId);
            return { ...item, currentTotp: totp };
          } catch {
            return item;
          }
        }),
      );
      setItems(updatedItems);
      itemsRef.current = updatedItems;
    } finally {
      isRefreshingRef.current = false;
      setIsRefreshing(false);
    }
  }

  const errorView = renderErrorView(error, loadTotpItems, "Load TOTP Items");
  if (errorView) return errorView;

  async function copyTotp(totp: string, title: string) {
    await Clipboard.copy(totp, { transient: preferences.copyPasswordTransient ?? true });
    showToast({ style: Toast.Style.Success, title: "TOTP Copied", message: title });
  }

  function getTimerColor(): Color {
    if (remainingSeconds > 10) return Color.Green;
    if (remainingSeconds > 5) return Color.Yellow;
    return Color.Red;
  }

  return (
    <List isLoading={isLoading || isRefreshing} searchBarPlaceholder="Search TOTP items...">
      <List.Section title="TOTP Codes" subtitle={isRefreshing ? "Refreshing..." : `Refreshing in ${remainingSeconds}s`}>
        {items.map((item) => (
          <List.Item
            key={`${item.shareId}-${item.itemId}`}
            icon={getItemIcon(item.type)}
            title={item.title}
            subtitle={item.vaultName}
            accessories={[
              {
                tag: {
                  value: item.currentTotp ? formatTotpCode(item.currentTotp) : "---",
                  color: getTimerColor(),
                },
              },
              { text: `${remainingSeconds}s`, icon: Icon.Clock },
            ]}
            actions={
              <ActionPanel>
                {item.currentTotp && (
                  <Action
                    title="Copy TOTP Code"
                    icon={Icon.Clipboard}
                    onAction={() => copyTotp(item.currentTotp!, item.title)}
                  />
                )}
                <Action
                  title="Refresh Codes"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={refreshTotpCodes}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {items.length === 0 && !isLoading && !error && (
        <List.EmptyView icon={Icon.Clock} title="No TOTP Items" description="None of your items have TOTP configured" />
      )}
    </List>
  );
}
