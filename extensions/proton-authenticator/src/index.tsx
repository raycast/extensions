import { Action, ActionPanel, List, showToast, Toast, Icon, confirmAlert, Alert, useNavigation } from "@raycast/api";
import { useCachedState, showFailureToast, useFrecencySorting } from "@raycast/utils";
import { useState, useEffect, useMemo } from "react";
import Fuse from "fuse.js";

import { STATE_KEYS } from "./lib/constants";
import { TOTPAccount, ImportMode, MissingKey, LoadResult } from "./types";
import { loadAccountsFromStorage, clearStoredData, getImportMode, setImportMode } from "./lib/storage";
import { generateTOTP, generateNextTOTP, getTimeRemaining } from "./lib/totp";
import { getProgressColor, getProgressIcon } from "./lib/colors";
import SetupFormJSON from "./components/SetupFormJSON";
import SetupSQLite from "./components/SetupSQLite";
import ModeSelector from "./components/ModeSelector";

type SetupStep = "select" | "json" | "sqlite" | null;

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
  const [setupStep, setSetupStep] = useState<SetupStep>(null);
  const [currentMode, setCurrentMode] = useState<ImportMode | null>(null);
  const [missingKeys, setMissingKeys] = useState<MissingKey[]>([]);
  const { push, pop } = useNavigation();

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

  // Pushed instead of switching the cached setup state, so Esc returns to the account list
  const openKeySetup = () => {
    push(
      <SetupSQLite
        onAccountsLoaded={(loadedAccounts, missing, undecodableCount) => {
          setAccounts(loadedAccounts);
          setMissingKeys(missing);
          showUndecodableWarning(undecodableCount);
          pop();
        }}
        onBack={pop}
      />,
    );
  };

  // Returns true if a warning toast was shown
  const showUndecodableWarning = (undecodableCount: number): boolean => {
    if (undecodableCount === 0) return false;
    showFailureToast(`${undecodableCount} ${undecodableCount === 1 ? "entry" : "entries"} could not be read`, {
      title: "Some Entries Skipped",
    });
    return true;
  };

  // Returns true if a warning toast was shown
  const showLoadWarnings = ({ missingKeys: missing, undecodableCount }: LoadResult): boolean => {
    if (missing.length > 0) {
      const entryCount = missing.reduce((sum, key) => sum + key.entryCount, 0);
      showToast({
        style: Toast.Style.Failure,
        title: `${entryCount} ${entryCount === 1 ? "entry" : "entries"} could not be decrypted`,
        message: `${missing.length} encryption ${missing.length === 1 ? "key is" : "keys are"} missing`,
        primaryAction: {
          title: "Add Encryption Key",
          onAction: (toast) => {
            toast.hide();
            openKeySetup();
          },
        },
      });
      return true;
    }
    return showUndecodableWarning(undecodableCount);
  };

  const loadAccounts = async () => {
    setIsLoading(true);
    try {
      const mode = await getImportMode();
      setCurrentMode(mode);
      const result = await loadAccountsFromStorage();
      setMissingKeys(result.missingKeys);
      if (result.accounts.length === 0) {
        setNeedsSetup(true);
        // Database setup explains why nothing loaded, the mode selector would not
        setSetupStep(result.missingKeys.length > 0 || result.undecodableCount > 0 ? "sqlite" : "select");
      } else {
        setAccounts(result.accounts);
        setNeedsSetup(false);
        setSetupStep(null);
        showLoadWarnings(result);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load accounts");
      setNeedsSetup(true);
      setSetupStep("select");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const result = await loadAccountsFromStorage();
      setAccounts(result.accounts);
      setMissingKeys(result.missingKeys);
      if (!showLoadWarnings(result)) {
        showToast(Toast.Style.Success, "Refreshed", `Loaded ${result.accounts.length} accounts`);
      }
    } catch (err) {
      showFailureToast(err instanceof Error ? err.message : "Failed to refresh accounts");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
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

  const handleAccountsLoaded = (loadedAccounts: TOTPAccount[], missing: MissingKey[] = [], undecodableCount = 0) => {
    setAccounts(loadedAccounts);
    setMissingKeys(missing);
    showUndecodableWarning(undecodableCount);
    setNeedsSetup(false);
    setSetupStep(null);
    setError(null);
    getImportMode().then(setCurrentMode);
  };

  const handleModeSelected = async (mode: ImportMode) => {
    if (mode === "json") {
      await setImportMode("json");
      setSetupStep("json");
    } else {
      setSetupStep("sqlite");
    }
  };

  const handleBackToModeSelect = () => {
    setSetupStep("select");
  };

  // setup flow
  if (needsSetup) {
    if (setupStep === "select") {
      return <ModeSelector onModeSelected={handleModeSelected} />;
    }
    if (setupStep === "json") {
      return <SetupFormJSON onAccountsLoaded={handleAccountsLoaded} />;
    }
    if (setupStep === "sqlite") {
      return <SetupSQLite onAccountsLoaded={handleAccountsLoaded} onBack={handleBackToModeSelect} />;
    }
    // default to mode selector if setup step is unclear
    return <ModeSelector onModeSelected={handleModeSelected} />;
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

  const navigationTitle = currentMode === "sqlite" ? "TOTP (Live)" : "TOTP (JSON)";

  return (
    <List
      navigationTitle={navigationTitle}
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
                  source: getProgressIcon(remaining / (account.period || 30)),
                  tintColor: colors.main,
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
                  {currentMode === "sqlite" && (
                    <Action
                      title="Refresh from Database"
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={handleRefresh}
                    />
                  )}
                  {currentMode === "sqlite" && missingKeys.length > 0 && (
                    <Action title="Add Missing Encryption Key" icon={Icon.Key} onAction={openKeySetup} />
                  )}
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
                          setSetupStep("select");
                          setCurrentMode(null);
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
