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
import { useCachedState, getProgressIcon, showFailureToast } from "@raycast/utils";
import { useState, useEffect, useMemo } from "react";
import Fuse from "fuse.js";

import { TOTPAccount } from "./types";
import { loadAccountsFromStorage, clearStoredData } from "./lib/storage";
import { authenticateWithTouchID, hasTouchID } from "./lib/auth";
import { generateTOTP, generateNextTOTP, getTimeRemaining } from "./lib/totp";
import { getProgressColor } from "./lib/colors";
import SetupForm from "./SetupForm";

export default function Command() {
  const [accounts, setAccounts] = useCachedState<TOTPAccount[]>("accounts", []);
  const [needsSetup, setNeedsSetup] = useCachedState<boolean>("needs-setup", false);
  const [codes, setCodes] = useState<Map<string, string>>(new Map());
  const [nextCodes, setNextCodes] = useState<Map<string, string>>(new Map());
  const [timeRemaining, setTimeRemaining] = useState(getTimeRemaining());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authTimestamp, setAuthTimestamp] = useCachedState<number | null>("auth-timestamp", null);
  const [authEnabled, setAuthEnabled] = useCachedState<boolean>("auth-enabled", true);
  const [authTimeout, setAuthTimeout] = useCachedState<number>("auth-timeout", 10 * 60 * 1000); // 10 minutes default
  const [searchText, setSearchText] = useState("");

  const AUTH_TIMEOUT_OPTIONS = {
    "10 minutes": 10 * 60 * 1000,
    "30 minutes": 30 * 60 * 1000,
    "1 hour": 60 * 60 * 1000,
  };
  const Metadata = List.Item.Detail.Metadata;
  const Label = Metadata.Label;
  const Separator = Metadata.Separator;

  // fuzzy search setup
  const fuse = useMemo(() => {
    return new Fuse(accounts, {
      keys: [
        { name: "name", weight: 0.7 },
        { name: "issuer", weight: 0.3 },
      ],
      threshold: 0.4,
      includeScore: true,
    });
  }, [accounts]);

  const filteredAccounts = useMemo(() => {
    if (!searchText.trim()) return accounts;
    return fuse.search(searchText).map((result) => result.item);
  }, [accounts, searchText, fuse]);

  // check if authentication is still valid or disabled
  const isAuthenticated = useMemo(() => {
    if (!authEnabled) return true; // skip auth if disabled
    if (!authTimestamp) return false;
    return Date.now() - authTimestamp < authTimeout;
  }, [authTimestamp, authEnabled, authTimeout]);

  const handleCopyCode = async (code: string) => {
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
      accounts.forEach((account) => {
        const code = generateTOTP(account);
        const nextCode = generateNextTOTP(account);
        newCodes.set(account.id, code);
        newNextCodes.set(account.id, nextCode);
      });
      setCodes(newCodes);
      setNextCodes(newNextCodes);
      setTimeRemaining(getTimeRemaining());
    };

    updateCodes();

    // update timer every second
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
    <List
      navigationTitle="Proton TOTP Codes"
      searchBarPlaceholder="Search accounts..."
      onSearchTextChange={setSearchText}
      isShowingDetail
    >
      {filteredAccounts.map((account) => {
        const code = codes.get(account.id) || "";
        const nextCode = nextCodes.get(account.id) || "";
        const displayName = account.issuer || account.name;
        const username = account.name;

        const { color, backgroundColor } = getProgressColor(timeRemaining);

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
                    <Label title="Time Remaining" text={`${timeRemaining}s`} />
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
                  source: getProgressIcon(timeRemaining / (account.period || 30), color, {
                    background: backgroundColor,
                    backgroundOpacity: 1,
                  }),
                },
              },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Current Code">
                  <Action title="Copy Current" icon={Icon.Key} onAction={() => handleCopyCode(code)} />
                  <Action.Paste title="Paste Current" icon={Icon.Key} content={code} />
                </ActionPanel.Section>
                <ActionPanel.Section title="Next Code">
                  <Action
                    title="Copy Next"
                    icon={Icon.Key}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    onAction={() => handleCopyCode(nextCode)}
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
