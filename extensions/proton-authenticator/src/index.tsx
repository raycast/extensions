import { Action, ActionPanel, List, showToast, Toast, Icon, confirmAlert, Alert } from "@raycast/api";
import { useCachedState, getProgressIcon, showFailureToast, useFrecencySorting } from "@raycast/utils";
import { useState, useEffect, useMemo } from "react";
import Fuse from "fuse.js";

import { STATE_KEYS } from "./lib/constants";
import { TOTPAccount } from "./types";
import { loadAccountsFromStorage, clearStoredData } from "./lib/storage";
import { generateTOTP, generateNextTOTP, getTimeRemaining } from "./lib/totp";
import { getProgressColor } from "./lib/colors";
import SetupForm from "./SetupForm";

export default function Command() {
  const [accounts, setAccounts] = useCachedState<TOTPAccount[]>(STATE_KEYS.ACCOUNTS, []);
  const [needsSetup, setNeedsSetup] = useCachedState<boolean>(STATE_KEYS.NEEDS_SETUP, false);
  const [codes, setCodes] = useState<Map<string, string>>(new Map());
  const [nextCodes, setNextCodes] = useState<Map<string, string>>(new Map());
  const [timeRemainingMap, setTimeRemainingMap] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [sortingMode, setSortingMode] = useCachedState<"frecency" | "alphabetical">(
    STATE_KEYS.SORTING_MODE,
    "frecency",
  );

  const {
    data: sortedByFrecency,
    visitItem,
    resetRanking,
  } = useFrecencySorting(accounts, {
    key: (account) => account.id,
  });

  const sortedAccounts = useMemo(() => {
    if (sortingMode === "alphabetical") {
      return [...accounts].sort((a, b) => {
        const nameA = a.issuer || a.name;
        const nameB = b.issuer || b.name;
        return nameA.localeCompare(nameB);
      });
    }
    return sortedByFrecency;
  }, [accounts, sortedByFrecency, sortingMode]);

  const fuse = useMemo(() => {
    return new Fuse(sortedAccounts, {
      keys: [
        { name: "issuer", weight: 0.6 },
        { name: "name", weight: 0.4 },
      ],
      threshold: 0.4,
      ignoreLocation: false,
      minMatchCharLength: 1,
      shouldSort: true,
    });
  }, [sortedAccounts]);

  const visibleAccounts = useMemo(() => {
    if (!searchText.trim()) return sortedAccounts;
    return fuse.search(searchText.trim()).map((r) => r.item);
  }, [fuse, searchText, sortedAccounts]);

  useEffect(() => {
    const loadAccounts = async () => {
      setIsLoading(true);
      try {
        const loadedAccounts = await loadAccountsFromStorage();
        if (loadedAccounts.length === 0) {
          setNeedsSetup(true);
        } else {
          setAccounts(loadedAccounts);
          setNeedsSetup(false);
        }
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load accounts");
        setNeedsSetup(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadAccounts();
  }, []);

  useEffect(() => {
    if (accounts.length === 0) return;

    const updateCodes = () => {
      const newCodes = new Map<string, string>();
      const newNextCodes = new Map<string, string>();
      const newRemaining = new Map<string, number>();
      accounts.forEach((account) => {
        const code = generateTOTP(account);
        const nextCode = generateNextTOTP(account);
        newCodes.set(account.id, code);
        newNextCodes.set(account.id, nextCode);
        newRemaining.set(account.id, getTimeRemaining(account.period || 30));
      });
      setCodes(newCodes);
      setNextCodes(newNextCodes);
      setTimeRemainingMap(newRemaining);
    };

    updateCodes();
    const interval = setInterval(updateCodes, 1000);
    return () => clearInterval(interval);
  }, [accounts]);

  const handleAccountsLoaded = (loadedAccounts: TOTPAccount[]) => {
    setAccounts(loadedAccounts);
    setNeedsSetup(false);
    setError(null);
  };

  if (needsSetup) {
    return <SetupForm onAccountsLoaded={handleAccountsLoaded} />;
  }

  if (!isLoading && error) {
    return (
      <List>
        <List.EmptyView title="Error Loading Accounts" description={error} icon={Icon.Warning} />
      </List>
    );
  }

  if (!isLoading && accounts.length === 0) {
    return (
      <List>
        <List.EmptyView title="No TOTP Accounts Found" icon={Icon.Lock} />
      </List>
    );
  }

  return (
    <List
      navigationTitle="TOTP codes"
      searchBarPlaceholder="Search accounts..."
      filtering={false}
      onSearchTextChange={(text) => setSearchText(text)}
      isLoading={isLoading}
    >
      {visibleAccounts.map((account) => {
        const code = codes.get(account.id) || "";
        const nextCode = nextCodes.get(account.id) || "";
        const displayName = account.issuer || account.name;
        const username = account.name;

        const remaining = timeRemainingMap.get(account.id) ?? getTimeRemaining(account.period || 30);
        const colors = getProgressColor(remaining);

        return (
          <List.Item
            key={account.id}
            title={displayName}
            subtitle={username}
            keywords={[displayName, username]}
            accessories={[
              { tag: code },
              {
                text: `${remaining}s`,
                icon: {
                  source: getProgressIcon(remaining / (account.period || 30), colors.main, {
                    background: colors.background,
                    backgroundOpacity: 1,
                  }),
                },
                tooltip: "Time remaining",
              },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Current Code">
                  <Action.CopyToClipboard
                    title="Copy Current"
                    icon={Icon.Clipboard}
                    content={code}
                    onCopy={() => visitItem(account)}
                    concealed={true}
                  />
                  <Action.Paste
                    title="Paste Current"
                    icon={Icon.Key}
                    content={code}
                    onPaste={() => visitItem(account)}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Next Code">
                  <Action.CopyToClipboard
                    title="Copy Next"
                    icon={Icon.Clipboard}
                    content={nextCode}
                    onCopy={() => visitItem(account)}
                    concealed={true}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                  />
                  <Action.Paste
                    title="Paste Next"
                    icon={Icon.Key}
                    content={nextCode}
                    onPaste={() => visitItem(account)}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Settings">
                  <Action
                    title={`Sort by ${sortingMode === "frecency" ? "Name" : "Usage"}`}
                    icon={sortingMode === "frecency" ? Icon.ArrowUp : Icon.BarChart}
                    shortcut={{ modifiers: ["cmd"], key: "s" }}
                    onAction={() => {
                      const newMode = sortingMode === "frecency" ? "alphabetical" : "frecency";
                      setSortingMode(newMode);
                      showToast(Toast.Style.Success, `Sorted by ${newMode === "frecency" ? "usage" : "name"}`);
                    }}
                  />
                  {sortingMode === "frecency" && (
                    <Action
                      title="Reset Usage Rankings"
                      icon={Icon.ArrowCounterClockwise}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
                      onAction={async () => {
                        const confirmed = await confirmAlert({
                          title: "Reset Usage Rankings",
                          message: "This will reset the usage statistics for all accounts. Are you sure?",
                          primaryAction: {
                            title: "Reset",
                            style: Alert.ActionStyle.Destructive,
                          },
                        });
                        if (confirmed) {
                          for (const a of accounts) {
                            await resetRanking(a);
                          }
                          showToast(Toast.Style.Success, "Usage rankings reset");
                        }
                      }}
                    />
                  )}
                  <Action
                    title="Reset Authenticator Data"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                    onAction={async () => {
                      const confirmed = await confirmAlert({
                        title: "Reset Authenticator Data",
                        message:
                          "This will delete all stored authenticator data. You'll need to set up your accounts again.",
                        primaryAction: {
                          title: "Reset",
                          style: Alert.ActionStyle.Destructive,
                        },
                      });

                      if (confirmed) {
                        try {
                          await clearStoredData();
                          setAccounts([]);
                          setNeedsSetup(true);
                          showToast(Toast.Style.Success, "Reset Complete");
                        } catch {
                          showFailureToast("Failed to reset authenticator data");
                        }
                      }
                    }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
