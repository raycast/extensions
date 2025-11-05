import {
  ActionPanel,
  List,
  Action,
  Icon,
  showToast,
  ToastStyle,
  Color,
  LocalStorage,
  showHUD,
  useNavigation,
} from "@raycast/api";
import { Form } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// --- Interfaces ---
interface SteamAccount {
  steamId64: string;
  accountName: string;
  personaName: string;
  nickname?: string;
  avatarUrl?: string;
  mostRecent: boolean;
  timestamp: string;
  isFavorite: boolean;
  isCurrentlyLoggedIn?: boolean; // Determined at runtime based on isSteamRunning and AutoLoginUser
}

interface SteamInstallation {
  path: string;
  accounts: SteamAccount[];
  autoLoginUserSteamId64?: string; // Stored from VDF parse
  isSteamClientRunning?: boolean; // Global status, propagated to accounts
}

// --- Local Storage for Favorites ---
const FAVORITES_KEY = "steam-favorites";
const NICKNAMES_KEY = "steam-nicknames";

async function getNicknames(): Promise<Map<string, string>> {
  const nicknamesJson = await LocalStorage.getItem<string>(NICKNAMES_KEY);
  if (nicknamesJson) {
    try {
      return new Map(JSON.parse(nicknamesJson));
    } catch {
      // Handle potential parsing errors, e.g., corrupted data
      return new Map();
    }
  }
  return new Map();
}

async function saveNicknames(nicknames: Map<string, string>): Promise<void> {
  await LocalStorage.setItem(NICKNAMES_KEY, JSON.stringify(Array.from(nicknames.entries())));
}

async function getFavorites(): Promise<Set<string>> {
  const favoritesJson = await LocalStorage.getItem<string>(FAVORITES_KEY);
  if (favoritesJson) {
    return new Set(JSON.parse(favoritesJson));
  }
  return new Set();
}

async function saveFavorites(favorites: Set<string>): Promise<void> {
  await LocalStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(favorites)));
}

// --- Helper Functions for Account Switching (Top Level) ---

async function killSteamProcess(): Promise<void> {
  try {
    await showToast({
      style: ToastStyle.Animated,
      title: "Closing Steam...",
      message: "Attempting to terminate Steam.exe process.",
    });
    await execAsync("taskkill /IM steam.exe /F", { windowsHide: true });
    await showToast({
      style: ToastStyle.Success,
      title: "Steam Closed",
      message: "Steam.exe process terminated.",
    });
    // Give Steam a moment to fully shut down
    await new Promise((resolve) => setTimeout(resolve, 2000));
  } catch (error: Error) {
    // If Steam.exe was not running, taskkill will throw an error, which is fine.
    if (error.message.includes("not found") || error.message.includes("not found for Steam.exe")) {
      await showToast({
        style: ToastStyle.Success,
        title: "Steam Not Running",
        message: "Steam.exe was not active, proceeding.",
      });
    } else {
      await showToast({
        style: ToastStyle.Failure,
        title: "Failed to close Steam",
        message: error.message,
      });
      throw new Error(`Failed to kill Steam process: ${error.message}`);
    }
  }
}

async function modifyLoginUsersVDF(vdfPath: string, targetSteamId64: string): Promise<void> {
  try {
    const content = await fs.promises.readFile(vdfPath, "utf8");
    const lines = content.split("\n");
    const newLines: string[] = [];

    let inUsersBlock = false; // Tracks if we are inside the main "users" block
    let inAccountBlock = false; // Tracks if we are inside an individual SteamID's block
    let currentSteamId64InParse: string | null = null; // To hold the SteamID of the current account block being processed

    for (const line of lines) {
      let modifiedLine = line;
      const trimmedLine = line.trim();

      // Detect "users" block start
      if (trimmedLine.includes(`"users"`)) {
        inUsersBlock = true;
        inAccountBlock = false; // Reset block state
        newLines.push(modifiedLine);
        continue;
      }

      // Detect closing brace "}"
      if (trimmedLine === "}") {
        if (inAccountBlock) {
          // End of an individual account block
          currentSteamId64InParse = null;
          inAccountBlock = false;
        } else if (inUsersBlock && line.indexOf("}") === 1) {
          // End of the main "users" block (check indentation)
          inUsersBlock = false;
        }
        newLines.push(modifiedLine);
        continue;
      }

      // If we are inside the main "users" block
      if (inUsersBlock) {
        // Look for AutoLoginUser in the main "users" block (outside any specific account block)
        if (!inAccountBlock) {
          const autoLoginMatch = trimmedLine.match(/^"AutoLoginUser"\s*"(.*?)"$/);
          if (autoLoginMatch) {
            modifiedLine = line.replace(/"AutoLoginUser"\s*"\d*"/g, `"AutoLoginUser"\t\t"${targetSteamId64}"`);
            newLines.push(modifiedLine);
            continue;
          }
          // Also set global RememberPassword if AutoLoginUser is set
          if (trimmedLine.startsWith(`"RememberPassword"`) && line.indexOf("}") !== 1) {
            modifiedLine = line.replace(/"RememberPassword"\s*"\d*"/g, `"RememberPassword"\t\t"1"`);
            newLines.push(modifiedLine);
            continue;
          }
        }

        // Detect SteamID64 line within the "users" block
        const steamIdLineMatch = trimmedLine.match(/^"(\d+)"$/);
        if (steamIdLineMatch && !inAccountBlock) {
          currentSteamId64InParse = steamIdLineMatch[1];
          // We found a SteamID line, the next line should be "{"
          newLines.push(modifiedLine);
          continue;
        }

        // Detect the opening brace "{" for an account block after a SteamID line
        if (currentSteamId64InParse && trimmedLine === "{") {
          inAccountBlock = true;
          newLines.push(modifiedLine);
          continue;
        }

        // Parse key-value pairs if inside an account block
        if (inAccountBlock && currentSteamId64InParse) {
          const kvMatch = trimmedLine.match(/^"([^"]+)"\s*"(.*?)"$/);
          if (kvMatch) {
            const key = kvMatch[1];

            if (currentSteamId64InParse === targetSteamId64) {
              // Modify for the target account
              if (key === "MostRecent") {
                modifiedLine = line.replace(/"MostRecent"\s*"\d+"/g, `"MostRecent"\\t\\t"1"`);
              } else if (key === "RememberPassword") {
                modifiedLine = line.replace(/"RememberPassword"\s*"\d+"/g, `"RememberPassword"\\t\\t"1"`);
              }
            } else {
              // Modify for other accounts (set to 0)
              if (key === "MostRecent") {
                modifiedLine = line.replace(/"MostRecent"\s*"\d+"/g, `"MostRecent"\\t\\t"0"`);
              } else if (key === "RememberPassword") {
                modifiedLine = line.replace(/"RememberPassword"\s*"\d+"/g, `"RememberPassword"\\t\\t"0"`);
              }
            }
          }
        }
      }
      newLines.push(modifiedLine); // Add the (potentially modified) line
    }

    const finalContent = newLines.join("\n");
    await fs.promises.writeFile(vdfPath, finalContent, "utf8");
    await showToast({
      style: ToastStyle.Success,
      title: "Configuration Updated",
      message: `loginusers.vdf updated for ${targetSteamId64}.`,
    });
  } catch (error: Error) {
    await showToast({
      style: ToastStyle.Failure,
      title: "Failed to update config",
      message: error.message,
    });
    throw error; // Re-throw to be caught by the action handler
  }
}

async function startSteam(installPath: string, accountName: string): Promise<void> {
  const steamExePath = path.join(installPath, "Steam.exe");
  try {
    await execAsync(`start "" "${steamExePath}" -login ${accountName}`, { windowsHide: true });
    await new Promise((resolve) => setTimeout(resolve, 5000));
  } catch (error: Error) {
    await showToast({
      style: ToastStyle.Failure,
      title: "Failed to launch Steam",
      message: error.message,
    });
  }
}

async function isSteamRunning(): Promise<boolean> {
  try {
    const { stdout } = await execAsync('tasklist /FI "IMAGENAME eq Steam.exe"', { windowsHide: true });
    return stdout.includes("Steam.exe");
  } catch {
    return false;
  }
}

// --- Helper functions for finding Steam installations and parsing VDF ---
async function findSteamInstallations(favorites: Set<string>): Promise<SteamInstallation[]> {
  const drives = ["C:", "D:", "E:"]; // Hardcoded for debugging. In a production version, you'd enumerate drives.
  const steamInstallations: SteamInstallation[] = [];

  for (const drive of drives) {
    const potentialSteamPaths = [
      path.join(drive, "Program Files (x86)", "Steam"), // Default 64-bit install
      path.join(drive, "Program Files", "Steam"), // Default 32-bit install (less common now)
      path.join(drive, "Steam"), // Common custom install at drive root
      path.join(drive, "Games", "Steam"), // Common custom install in a Games folder
      path.join(drive, ".games", "Steam"), // Based on user's example E:\.games\steamapps, assuming Steam client is at E:\.games\Steam
    ];

    for (const p of potentialSteamPaths) {
      const steamExePath = path.join(p, "Steam.exe");
      const configPath = path.join(p, "config", "loginusers.vdf");

      const steamExeExists = fs.existsSync(steamExePath);
      const configPathExists = fs.existsSync(configPath);

      if (steamExeExists && configPathExists) {
        // Ensure unique paths
        if (!steamInstallations.some((install) => install.path === p)) {
          try {
            const { accounts, autoLoginUserSteamId64 } = await parseLoginUsersVDF(configPath);
            const accountsWithFavorites = accounts.map((account) => ({
              ...account,
              isFavorite: favorites.has(account.steamId64),
            }));

            if (accountsWithFavorites.length > 0) {
              steamInstallations.push({ path: p, accounts: accountsWithFavorites, autoLoginUserSteamId64 });
            }
          } catch {
            showToast({
              style: ToastStyle.Failure,
              title: "VDF Parse Error",
              message: `Could not parse accounts from ${path.basename(configPath)} in ${p}`,
            });
          }
        }
      }
    }
  }
  return steamInstallations;
}

// Robust VDF parser
async function parseLoginUsersVDF(
  vdfPath: string,
): Promise<{ accounts: SteamAccount[]; autoLoginUserSteamId64?: string }> {
  const accounts: SteamAccount[] = [];
  let autoLoginUserSteamId64: string | undefined;

  try {
    const content = await fs.promises.readFile(vdfPath, "utf8");
    const lines = content.split("\n");

    let currentSteamId64: string | null = null;
    let currentAccount: Partial<SteamAccount> = {};
    let inUsersBlock = false;
    let inAccountBlock = false;

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Detect "users" block start
      if (trimmedLine.includes(`"users"`)) {
        inUsersBlock = true;
        inAccountBlock = false; // Reset block state
        continue;
      }

      // Detect closing brace "}"
      if (trimmedLine === "}") {
        if (inAccountBlock) {
          // End of an account block, push if valid
          if (currentAccount.steamId64 && currentAccount.accountName && currentAccount.personaName) {
            accounts.push(currentAccount as SteamAccount);
          }
          currentSteamId64 = null;
          currentAccount = {};
          inAccountBlock = false;
        } else if (inUsersBlock && line.indexOf("}") === 1) {
          // End of the main "users" block (check indentation)
          inUsersBlock = false;
        }
        continue;
      }

      if (inUsersBlock) {
        // Look for AutoLoginUser in the main "users" block (outside any specific account block)
        if (!inAccountBlock) {
          const autoLoginMatch = trimmedLine.match(/^"AutoLoginUser"\s*"(.*?)"$/);
          if (autoLoginMatch) {
            autoLoginUserSteamId64 = autoLoginMatch[1];
            continue;
          }
        }

        // Detect SteamID64 line within the "users" block
        const steamIdLineMatch = trimmedLine.match(/^"(\d+)"$/);
        if (steamIdLineMatch && !inAccountBlock) {
          currentSteamId64 = steamIdLineMatch[1];
          currentAccount = { steamId64: currentSteamId64 };
          continue;
        }

        // Detect the opening brace "{" for an account block after a SteamID line
        if (currentSteamId64 && trimmedLine === "{") {
          inAccountBlock = true;
          continue;
        }

        // Parse key-value pairs if inside an account block
        if (inAccountBlock && currentSteamId64) {
          const kvMatch = trimmedLine.match(/^"([^"]+)"\s*"(.*?)"$/);
          if (kvMatch) {
            const key = kvMatch[1];
            const value = kvMatch[2];
            switch (key) {
              case "AccountName":
                currentAccount.accountName = value;
                break;
              case "PersonaName":
                currentAccount.personaName = value;
                break;
              case "MostRecent":
                currentAccount.mostRecent = value === "1";
                break;
              case "Timestamp":
                currentAccount.timestamp = value; // This is a Unix timestamp string
                break;
            }
          }
        }
      }
    }
    // After loop, push any remaining account if valid (in case file ends without final '}')
    if (inAccountBlock && currentAccount.steamId64 && currentAccount.accountName && currentAccount.personaName) {
      accounts.push(currentAccount as SteamAccount);
    }
  } catch (error) {
    showToast({
      style: ToastStyle.Failure,
      title: "Failed to read Steam config",
      message: `Could not read ${path.basename(vdfPath)}.`,
    });
    throw error;
  }
  return { accounts, autoLoginUserSteamId64 };
}

function SetNicknameForm({ account, onNicknameSet }: { account: SteamAccount; onNicknameSet: () => void }) {
  const { pop } = useNavigation();
  const [nickname, setNickname] = useState(account.nickname || "");

  async function handleSubmit() {
    const nicknames = await getNicknames();
    if (nickname) {
      nicknames.set(account.steamId64, nickname);
    } else {
      nicknames.delete(account.steamId64);
    }
    await saveNicknames(nicknames);
    onNicknameSet();
    showToast({ style: ToastStyle.Success, title: "Nickname Saved" });
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Nickname" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="nickname"
        title="Nickname"
        placeholder={account.personaName + " (leave empty to clear)"}
        value={nickname}
        onChange={setNickname}
      />
    </Form>
  );
}

export default function Command() {
  const { popToRoot } = useNavigation();
  const [steamInstallations, setSteamInstallations] = useState<SteamInstallation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [nicknames, setNicknames] = useState<Map<string, string>>(new Map());

  const [selectedAccount, setSelectedAccount] = useState<SteamAccount | null>(null);

  // Helper to construct markdown for the Detail view
  const getAccountDetailMarkdown = useCallback(
    (account: SteamAccount, installPath: string): string => {
      // isCurrentlyLoggedIn is now directly on the account object thanks to enrichment
      const isCurrentlyLoggedIn = account.isCurrentlyLoggedIn;
      const lastLoginDate = new Date(parseInt(account.timestamp) * 1000).toLocaleString();

      let statusLine = "";
      if (account.isFavorite) {
        statusLine += `⭐ **Favorite Account**\n`;
      }
      if (isCurrentlyLoggedIn) {
        statusLine += `🟢 **Currently Logged In**\n`;
      } else if (account.mostRecent) {
        statusLine += `🔵 **Recently Used**\n`;
      }

      return `
# ${account.nickname ? `${account.nickname} (${account.personaName})` : account.personaName}
${statusLine}
---
**Account Name**: \`${account.accountName}\`
**SteamID64**: \`${account.steamId64}\`
**Last Login**: ${lastLoginDate}
**Steam Installation**: \`${installPath}\`

[View Steam Community Profile](https://steamcommunity.com/profiles/${account.steamId64})
`;
    },
    [], // No dependencies, will only be created once
  );

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const loadedFavorites = await getFavorites();
      setFavorites(loadedFavorites);
      const loadedNicknames = await getNicknames();
      setNicknames(loadedNicknames);

      const runningStatus = await isSteamRunning();

      const installs = await findSteamInstallations(loadedFavorites);
      // Enrich accounts within installations with runtime/global status
      const enrichedInstalls: SteamInstallation[] = installs.map((install) => ({
        ...install,
        // isSteamClientRunning is no longer explicitly stored here as it's not used directly from install object after being set globally.
        accounts: install.accounts.map((account) => ({
          ...account,
          nickname: loadedNicknames.get(account.steamId64),
          isCurrentlyLoggedIn: runningStatus && account.steamId64 === install.autoLoginUserSteamId64,
        })),
      }));

      setSteamInstallations(enrichedInstalls);

      // Set initial selected account (e.g., first favorite, then currently logged in, then most recent, then just first)
      let initialSelected: SteamAccount | null = null;

      const allAccounts = enrichedInstalls.flatMap((install) =>
        install.accounts.map((acc) => ({ ...acc, installPath: install.path })),
      );

      // Sort all accounts to find the best initial selection
      allAccounts.sort((a, b) => {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;

        if (a.isCurrentlyLoggedIn && !b.isCurrentlyLoggedIn) return -1;
        if (!a.isCurrentlyLoggedIn && b.isCurrentlyLoggedIn) return 1;

        if (a.mostRecent && !b.mostRecent) return -1;
        if (!a.mostRecent && b.mostRecent) return 1;

        return (a.nickname || a.personaName).localeCompare(b.nickname || b.personaName);
      });

      if (allAccounts.length > 0) {
        initialSelected = allAccounts[0];
      }

      setSelectedAccount(initialSelected);
      if (installs.length === 0) {
        setError("No Steam installations found.");
      }
    } catch (e: Error) {
      setError(`Failed to load Steam data: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  }, []); // Only re-create loadData if its dependencies change, currently none for simplicity

  useEffect(() => {
    loadData();
  }, [loadData]); // Re-run effect if loadData callback changes

  const handleSwitchAccount = async (installPath: string, account: SteamAccount) => {
    await showToast({
      style: ToastStyle.Animated,
      title: `Switching to ${account.nickname || account.personaName}...`,
      message: "Closing Steam and updating configuration.",
    });

    try {
      await killSteamProcess();
      const configPath = path.join(installPath, "config", "loginusers.vdf");
      await modifyLoginUsersVDF(configPath, account.steamId64);
      await startSteam(installPath, account.accountName); // Start Steam after VDF is modified

      await showHUD(`Successfully switched to ${account.nickname || account.personaName}.`);

      // Refresh data after successful switch to reflect new state
      await loadData();
      popToRoot();
    } catch (error: Error) {
      await showToast({
        style: ToastStyle.Failure,
        title: "Switch Failed",
        message: String(error), // Safely convert error to string for display
      });
    }
  };

  const toggleFavorite = async (steamId64: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(steamId64)) {
      newFavorites.delete(steamId64);
      await showToast({ style: ToastStyle.Success, title: "Removed from Favorites" });
    } else {
      newFavorites.add(steamId64);
      await showToast({ style: ToastStyle.Success, title: "Added to Favorites" });
    }
    setFavorites(newFavorites);
    await saveFavorites(newFavorites);

    // Refresh data to reflect favorite status in UI
    await loadData();
  };

  // Sort accounts: favorites first, then by currently logged in, then by most recent, then by persona name
  const sortedInstallations = steamInstallations.map((install) => ({
    ...install,
    accounts: [...install.accounts].sort((a, b) => {
      // Primary sort: Favorites first
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;

      // Secondary sort: Currently logged in
      if (a.isCurrentlyLoggedIn && !b.isCurrentlyLoggedIn) return -1;
      if (!a.isCurrentlyLoggedIn && b.isCurrentlyLoggedIn) return 1;

      // Tertiary sort: Most recent first
      if (a.mostRecent && !b.mostRecent) return -1;
      if (!a.mostRecent && b.mostRecent) return 1;

      // Quaternary sort: Alphabetical by PersonaName
      return (a.nickname || a.personaName).localeCompare(b.nickname || b.personaName);
    }),
  }));

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search Steam accounts..."
      enableFiltering
      navigationTitle="Steam Account Switcher" // This enables the detail view and sets the title
      selectedItemId={selectedAccount?.steamId64} // Highlight selected item
    >
      {error && <List.EmptyView icon={Icon.Warning} title="Error" description={error} />}
      {!isLoading && steamInstallations.length === 0 && !error && (
        <List.EmptyView
          icon={Icon.Box}
          title="No Steam installations found."
          description="Ensure Steam is installed on one of your drives."
        />
      )}
      {sortedInstallations.map((install) => (
        <List.Section
          key={install.path}
          title={`Steam Installation at ${install.path}`}
          subtitle={`${install.accounts.length} Accounts`}
        >
          {install.accounts.map((account) => {
            const accessories = [{ text: account.accountName }]; // Always show account name

            if (account.isFavorite) {
              accessories.push({
                tag: { value: "Favorite", color: Color.Yellow },
                tooltip: "Favorite Account",
              });
            }

            if (account.isCurrentlyLoggedIn) {
              accessories.push({
                tag: { value: "Logged In", color: Color.Green },
                tooltip: "Logged In",
              });
            }
            if (account.mostRecent) {
              accessories.push({
                tag: { value: "Recently Used", color: Color.Blue },
                tooltip: "Recently Used",
              });
            }

            return (
              <List.Item
                key={account.steamId64}
                id={account.steamId64} // Required for selectedItemId to work
                icon={account.isFavorite ? Icon.Star : Icon.Person} // Icon for favorite, otherwise person
                title={account.nickname ? `${account.nickname} (${account.personaName})` : account.personaName}
                accessories={accessories}
                detail={<List.Item.Detail markdown={getAccountDetailMarkdown(account, install.path)} />}
                actions={
                  <ActionPanel>
                    <Action
                      title={`Switch to ${account.nickname || account.personaName}`}
                      onAction={() => handleSwitchAccount(install.path, account)}
                      icon={Icon.Play}
                    />
                    <Action.OpenInBrowser
                      title="Open Steam Community Profile"
                      url={`https://steamcommunity.com/profiles/${account.steamId64}`}
                      icon={Icon.Link}
                    />
                    <Action
                      title={account.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                      onAction={() => toggleFavorite(account.steamId64)}
                      icon={account.isFavorite ? Icon.StarDisabled : Icon.Star}
                      shortcut={{ modifiers: ["shift"], key: "f" }}
                    />
                    <Action.Push
                      title="Set Nickname"
                      icon={Icon.Pencil}
                      target={<SetNicknameForm account={account} onNicknameSet={loadData} />}
                      shortcut={{ modifiers: ["shift"], key: "n" }}
                    />
                    <ActionPanel.Section>
                      <Action
                        title="Refresh Account Data"
                        onAction={loadData}
                        icon={Icon.RotateClockwise}
                        shortcut={{ modifiers: ["ctrl"], key: "r" }}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
