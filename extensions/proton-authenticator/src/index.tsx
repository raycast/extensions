import {
  Action,
  ActionPanel,
  List,
  showToast,
  showHUD,
  Toast,
  Icon,
  confirmAlert,
  Alert,
  Clipboard,
  closeMainWindow,
} from "@raycast/api";
import { useCachedState, getProgressIcon, showFailureToast, useFrecencySorting } from "@raycast/utils";
import { useState, useEffect, useMemo } from "react";

import { STATE_KEYS } from "./lib/constants";

import { TOTPAccount } from "./types";
import { loadAccountsFromStorage, clearStoredData } from "./lib/storage";
import { authenticateWithTouchID, hasTouchID } from "./lib/auth";
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
  const [error, setError] = useState<string | null>(null);
  const [authTimestamp, setAuthTimestamp] = useCachedState<number | null>(STATE_KEYS.AUTH_TIMESTAMP, null);
  const [authEnabled, setAuthEnabled] = useCachedState<boolean>(STATE_KEYS.AUTH_ENABLED, true);
  const [authTimeout, setAuthTimeout] = useCachedState<number>(STATE_KEYS.AUTH_TIMEOUT, 10 * 60 * 1000); // 10 minutes default
  const [sortingMode, setSortingMode] = useCachedState<"frecency" | "alphabetical">(
    STATE_KEYS.SORTING_MODE,
    "frecency",
  );

  const AUTH_TIMEOUT_OPTIONS = {
    "10 minutes": 10 * 60 * 1000,
    "30 minutes": 30 * 60 * 1000,
    "1 hour": 60 * 60 * 1000,
  };
  const Metadata = List.Item.Detail.Metadata;
  const Label = Metadata.Label;
  const Separator = Metadata.Separator;

  const {
    data: sortedByFrecency,
    visitItem,
    resetRanking,
  } = useFrecencySorting(accounts, {
    key: (account) => account.id,
  });

  // create final sorted accounts based on sorting mode

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

  // check if authentication is still valid or disabled
  const isAuthenticated = useMemo(() => {
    if (!authEnabled) return true; // skip auth if disabled
    if (!authTimestamp) return false;
    return Date.now() - authTimestamp < authTimeout;
  }, [authTimestamp, authEnabled, authTimeout]);

  const handleCopyCode = async (code: string, account: TOTPAccount) => {
    // track usage for frecency sorting
    visitItem(account);

    await Clipboard.copy(code);
    setTimeout(() => {
      showHUD("Copied to clipboard");
    }, 100);
    await closeMainWindow();
  };

  if (!hasTouchID()) {
    return (
      <List>
        <List.EmptyView
          title="Touch ID Required"
          description="This extension requires a Mac with Touch ID support."
          icon="⚠️"
        />
      </List>
    );
  }

  const handleAuthentication = async () => {
    if (isAuthenticated) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const authenticated = await authenticateWithTouchID();
      if (authenticated) {
        setAuthTimestamp(Date.now());
        showToast(Toast.Style.Success, "Authentication Successful");
      } else {
        setError("Authentication failed. Please try again.");
        showFailureToast("Touch ID authentication was unsuccessful", { title: "Authentication Failed" });
      }
    } catch (error) {
      console.error("Authentication error:", error);
      setError("Authentication failed");
      showFailureToast("An error occurred during authentication");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleAuth = async () => {
    // require authentication to disable Touch ID regardless of current auth state
    if (authEnabled) {
      try {
        const authenticated = await authenticateWithTouchID();
        if (!authenticated) {
          showFailureToast("Authentication required to disable Touch ID", { title: "Authentication Failed" });
          return;
        }
      } catch (error) {
        console.error("Authentication error:", error);
        showFailureToast("Authentication failed");
        return;
      }
    }

    const newAuthState = !authEnabled;
    setAuthEnabled(newAuthState);

    if (newAuthState) {
      showToast(Toast.Style.Success, "Touch ID Enabled");
    } else {
      setAuthTimestamp(null); // clear auth when disabled
      showToast(Toast.Style.Success, "Touch ID Disabled");
    }
  };
  const handleSetAuthTimeout = async (label: string, timeoutMs: number) => {
    setAuthTimeout(timeoutMs);
    showToast(Toast.Style.Success, `Auth timeout set to ${label}`);
  };

  const handleClearAuth = async () => {
    setAuthTimestamp(null);
    showToast(Toast.Style.Success, "Authentication cleared");
  };

  const handleToggleSort = () => {
    const newMode = sortingMode === "frecency" ? "alphabetical" : "frecency";
    setSortingMode(newMode);
    showToast(Toast.Style.Success, `Sorted by ${newMode === "frecency" ? "usage" : "name"}`);
  };

  const handleResetRankings = async () => {
    const confirmed = await confirmAlert({
      title: "Reset Usage Rankings",
      message: "This will reset the usage statistics for all accounts. Are you sure?",
      primaryAction: {
        title: "Reset",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      for (const account of accounts) {
        await resetRanking(account);
      }
      showToast(Toast.Style.Success, "Usage rankings reset");
    }
  };

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

  if (!isLoading && !isAuthenticated && authEnabled) {
    return (
      <List>
        <List.EmptyView
          title="Authentication Required"
          description="Touch ID authentication is required to access your TOTP codes"
          icon="🔐"
          actions={
            <ActionPanel>
              <Action title="Authenticate with Touch ID" onAction={handleAuthentication} icon="🔓" />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (!isLoading && error) {
    return (
      <List>
        <List.EmptyView title="Error Loading Accounts" description={error} icon="⚠️" />
      </List>
    );
  }

  if (!isLoading && accounts.length === 0) {
    return (
      <List>
        <List.EmptyView title="No TOTP Accounts Found" icon="🔐" />
      </List>
    );
  }

  if (isLoading) {
    return <List isLoading={true} />;
  }

  return (
    <List navigationTitle="TOTP codes" searchBarPlaceholder="Search accounts..." isShowingDetail>
      {sortedAccounts.map((account) => {
        const code = codes.get(account.id) || "";
        const nextCode = nextCodes.get(account.id) || "";
        const displayName = account.issuer || account.name;
        const username = account.name;

        const remaining = timeRemainingMap.get(account.id) ?? getTimeRemaining(account.period || 30);
        const { color, backgroundColor } = getProgressColor(remaining);

        return (
          <List.Item
            key={account.id}
            title={displayName}
            subtitle={username}
            icon={Icon.Key}
            keywords={[displayName, username]}
            detail={
              <List.Item.Detail
                metadata={
                  <Metadata>
                    <Label title="Current Code" text={code} />
                    <Label title="Next Code" text={nextCode} />
                    <Label title="Time Remaining" text={`${remaining}s`} />
                    <Separator />
                    <Label title="Username" text={username} />
                    <Label title="Issuer" text={account.issuer || "N/A"} />
                    <Separator />
                    <Label title="Algorithm" text={account.algorithm} />
                    <Label title="Digits" text={account.digits.toString()} />
                    <Label title="Period" text={`${account.period}s`} />
                  </Metadata>
                }
              />
            }
            accessories={[
              {
                icon: {
                  source: getProgressIcon(remaining / (account.period || 30), color, {
                    background: backgroundColor,
                    backgroundOpacity: 1,
                  }),
                },
              },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Current Code">
                  <Action title="Copy Current" icon={Icon.Clipboard} onAction={() => handleCopyCode(code, account)} />
                  <Action.Paste title="Paste Current" icon={Icon.Key} content={code} />
                </ActionPanel.Section>
                <ActionPanel.Section title="Next Code">
                  <Action
                    title="Copy Next"
                    icon={Icon.Clipboard}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    onAction={() => handleCopyCode(nextCode, account)}
                  />
                  <Action.Paste
                    title="Paste Next"
                    icon={Icon.Key}
                    content={nextCode}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Authentication">
                  <Action
                    title={authEnabled ? "Disable Touch ID" : "Enable Touch ID"}
                    icon={authEnabled ? Icon.LockDisabled : Icon.Lock}
                    shortcut={{ modifiers: ["cmd"], key: "t" }}
                    onAction={handleToggleAuth}
                  />
                  {authEnabled && (
                    <>
                      <ActionPanel.Submenu
                        title={"Set Timeout"}
                        icon={Icon.Clock}
                        shortcut={{ modifiers: ["cmd"], key: "d" }}
                      >
                        {Object.entries(AUTH_TIMEOUT_OPTIONS).map(([label, timeout]) => (
                          <Action
                            key={label}
                            title={label}
                            onAction={() => handleSetAuthTimeout(label, timeout)}
                            icon={authTimeout === timeout ? Icon.Check : undefined}
                          />
                        ))}
                      </ActionPanel.Submenu>
                      <Action
                        title="Clear Authentication"
                        icon={Icon.RotateClockwise}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                        onAction={handleClearAuth}
                      />
                    </>
                  )}
                </ActionPanel.Section>
                <ActionPanel.Section title="Settings">
                  <Action
                    title={`Sort by ${sortingMode === "frecency" ? "Name" : "Usage"}`}
                    icon={sortingMode === "frecency" ? Icon.ArrowUp : Icon.BarChart}
                    shortcut={{ modifiers: ["cmd"], key: "s" }}
                    onAction={handleToggleSort}
                  />
                  {sortingMode === "frecency" && (
                    <Action
                      title="Reset Usage Rankings"
                      icon={Icon.ArrowCounterClockwise}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
                      onAction={handleResetRankings}
                    />
                  )}
                  <Action
                    title="Reset Authenticator Data"
                    icon={Icon.Trash}
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
