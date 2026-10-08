import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  getPreferenceValues,
  LocalStorage,
  openExtensionPreferences,
  Icon,
  Clipboard,
  open,
} from "@raycast/api";
import {
  searchTableauItems,
  getItemUrl,
  PREFERENCES_MISSING_ERROR,
  AUTH_CREDENTIALS_MISSING_ERROR,
  getTableauAuthToken,
} from "./utils";
import { useState, useEffect } from "react";
import { TableauView, TableauWorkbook } from "./types";
import { showFailureToast } from "@raycast/utils";

type TableauListItem = TableauView | TableauWorkbook;

interface RaycastPreferences {
  tableauServerUrl: string;
  tableauApiVersion: string;
  personalAccessTokenName?: string;
  personalAccessTokenSecret?: string;
  tableauSiteId?: string;
}

function WelcomeScreen({ errorMessage }: { errorMessage?: string }) {
  return (
    <List>
      <List.EmptyView
        title="Connect to Tableau"
        description={
          errorMessage
            ? `There was a problem connecting to your Tableau server:\n\n${errorMessage}\n\nPlease update your connection settings in Extension Preferences.`
            : "To get started, configure your Tableau server connection in Extension Preferences."
        }
        icon={Icon.Globe}
        actions={
          <ActionPanel>
            <Action
              title="Open Extension Preferences"
              onAction={openExtensionPreferences}
              icon={Icon.Gear}
              // shortcut={{ modifiers: ["cmd"], key: "," }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}

export default function TableauSearchCommand() {
  const [items, setItems] = useState<TableauListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [error, setError] = useState<Error | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [connectionErrorMessage, setConnectionErrorMessage] = useState<string | undefined>();
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = () => setRefreshKey((prev) => prev + 1);

  useEffect(() => {
    let isCancelled = false;

    async function fetchItems() {
      setIsLoading(true);
      setError(null);

      try {
        const results = await searchTableauItems(searchText);

        if (!isCancelled) {
          setItems(results);
          setShowWelcome(false);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          console.error("Error caught in fetchItems:", err instanceof Error ? err.message : String(err));
          setError(err instanceof Error ? err : new Error(String(err)));

          const errorMessage = err instanceof Error ? err.message : String(err);
          const isAuthError =
            errorMessage === PREFERENCES_MISSING_ERROR ||
            errorMessage === AUTH_CREDENTIALS_MISSING_ERROR ||
            errorMessage.includes("Authentication Failed") ||
            errorMessage.includes("Signin Error") ||
            errorMessage.includes("401") ||
            errorMessage.includes("auth") ||
            errorMessage.includes("token");

          if (isAuthError) {
            console.log("Authentication error detected:", errorMessage);
            await LocalStorage.removeItem("tableauSessionToken");
            await LocalStorage.removeItem("tableauActualSiteId");
            setConnectionErrorMessage(errorMessage);
            setShowWelcome(true);
          }
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    async function checkInitialConfig() {
      try {
        const rcPrefs = getPreferenceValues<RaycastPreferences>();

        const hasAllSettings =
          rcPrefs.tableauServerUrl &&
          rcPrefs.tableauApiVersion &&
          rcPrefs.personalAccessTokenName &&
          rcPrefs.personalAccessTokenSecret;

        if (!hasAllSettings) {
          console.log("Missing configuration in preferences, showing welcome screen");
          setConnectionErrorMessage("Missing required configuration settings.");
          setShowWelcome(true);
          setIsLoading(false);
          return;
        }

        console.log("Configuration found in preferences, testing connection...");
        setIsLoading(true);

        try {
          await LocalStorage.removeItem("tableauSessionToken");
          await LocalStorage.removeItem("tableauActualSiteId");

          const authResponse = await getTableauAuthToken();

          if (!authResponse || !authResponse.token) {
            throw new Error("Authentication failed - no token received");
          }

          console.log("Connection successful, loading data...");
          await fetchItems();
        } catch (connectionError) {
          console.error("Connection test failed:", connectionError);

          const errorMessage =
            connectionError instanceof Error
              ? connectionError.message
              : "Could not connect to Tableau server. Please check your credentials.";

          setConnectionErrorMessage(errorMessage);
          setShowWelcome(true);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error checking initial config:", error);
        setConnectionErrorMessage(
          "Error checking configuration: " + (error instanceof Error ? error.message : "Unknown error"),
        );
        setShowWelcome(true);
        setIsLoading(false);
      }
    }

    checkInitialConfig();

    return () => {
      isCancelled = true;
    };
  }, [searchText, refreshKey]);

  if (showWelcome) {
    return <WelcomeScreen errorMessage={connectionErrorMessage} />;
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchText={searchText}
      throttle
      searchBarPlaceholder="Search Tableau dashboards and charts..."
    >
      {error && (
        <List.EmptyView
          title={
            error.message.includes("Authentication Failed") || error.message.includes("Signin Error")
              ? "Authentication Error"
              : error.name || "Error"
          }
          description={
            error.message === PREFERENCES_MISSING_ERROR
              ? "Server URL or API Version missing. Please update your settings in Extension Preferences."
              : error.message === AUTH_CREDENTIALS_MISSING_ERROR
                ? "Personal Access Token credentials are missing. Please update your settings in Extension Preferences."
                : error.message.includes("Authentication Failed") || error.message.includes("Signin Error")
                  ? `Failed to authenticate with your Tableau server. Please check and update your credentials.\n\nError details: ${error.message}\n\nCommon issues:\n- Incorrect Personal Access Token name or secret\n- Invalid server URL\n- Network connectivity problems\n- PAT permissions insufficient`
                  : `${error.message}\n\nIf this is an authentication issue, please update your settings in Extension Preferences.`
          }
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <Action
                title="Open Extension Preferences"
                onAction={openExtensionPreferences}
                icon={Icon.Gear}
                shortcut={{ modifiers: ["cmd"], key: "," }}
              />
              <Action
                title="Retry"
                onAction={triggerRefresh}
                icon={Icon.Repeat}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      )}
      {!error && !isLoading && items.length === 0 && (
        <List.EmptyView
          title="No Results"
          description={searchText ? "No items match your search." : "No dashboards or charts found."}
        />
      )}
      {items.map((item) => (
        <List.Item
          key={item.id}
          title={item.name}
          subtitle={
            item.itemType === "Workbook"
              ? `Project: ${item.project?.name ?? "Unknown"}`
              : `Workbook: ${item.workbook?.name ?? "Unknown"}`
          }
          icon={item.itemType === "Workbook" ? Icon.Box : Icon.LineChart}
          accessories={[{ tag: item.itemType }, { date: new Date(item.updatedAt), tooltip: "Last Updated" }]}
          actions={
            <ActionPanel>
              <Action
                title="Open in Browser"
                icon={Icon.Globe}
                onAction={async () => {
                  try {
                    const url = await getItemUrl(item);
                    open(url);
                  } catch (e) {
                    await showFailureToast(e, { title: "Could not open URL" });
                  }
                }}
              />
              <Action
                title="Copy to Clipboard"
                icon={Icon.CopyClipboard}
                onAction={async () => {
                  try {
                    const url = await getItemUrl(item);
                    await Clipboard.copy(url);
                    await showToast(Toast.Style.Success, "Link Copied!");
                  } catch (e) {
                    await showFailureToast(e, { title: "Could not copy link" });
                  }
                }}
              />
              <ActionPanel.Section>
                <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
