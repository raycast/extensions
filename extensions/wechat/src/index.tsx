import { confirmAlert, launchCommand, LaunchType, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { SearchListItem } from "./components/searchListltem";
import { useSearch } from "./hooks/useSearch";
import { storageService } from "./services/storageService";
import { SearchResult } from "./types";
import { WeChatManager } from "./utils/wechatManager";

export default function Command() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [environmentReady, setEnvironmentReady] = useState(false);
  const { state, search, clearRecentContacts } = useSearch();
  const [pinnedContacts, setPinnedContacts] = useState<SearchResult[]>([]);

  useEffect(() => {
    checkRequirements();
    loadPinnedContacts();
  }, []);

  const openManageTweak = async () => {
    try {
      await launchCommand({
        name: "manageTweak",
        type: LaunchType.UserInitiated,
      });
    } catch (error) {
      console.error("Failed to launch manageTweak:", error);

      // If it cannot be opened automatically, display a prompt
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to open WeChatTweak Manager",
        message: "Please open WeChatTweak Manager manually",
      });
    }
  };

  const checkRequirements = async () => {
    try {
      let requirementsMessage = "";
      let shouldOpenManager = false;

      // Check if WeChat is installed
      const isWeChatInstalled = WeChatManager.isWeChatInstalled();
      if (!isWeChatInstalled) {
        requirementsMessage = "WeChat is not installed. Would you like to open WeChatTweak Manager to install it?";
        shouldOpenManager = true;
      }
      // Check if WeChat is running
      else if (!WeChatManager.isWeChatRunning()) {
        requirementsMessage = "WeChat is not running. Would you like to open WeChatTweak Manager to start it?";
        shouldOpenManager = true;
      }
      // Check if WeChatTweak is installed
      else if (!WeChatManager.isWeChatTweakInstalled()) {
        requirementsMessage = "WeChatTweak is not installed. Would you like to open WeChatTweak Manager to install it?";
        shouldOpenManager = true;
      }
      // Check if WeChatTweak is installed
      else {
        try {
          const isServiceRunning = await WeChatManager.isWeChatServiceRunning();
          if (!isServiceRunning) {
            requirementsMessage =
              "WeChat service is not running. Would you like to open WeChatTweak Manager to fix this issue?";
            shouldOpenManager = true;
          }
        } catch (serviceError) {
          console.error("Error checking WeChat service:", serviceError);
          requirementsMessage =
            "Failed to check WeChat service. Would you like to open WeChatTweak Manager to fix this issue?";
          shouldOpenManager = true;
        }
      }

      if (shouldOpenManager) {
        // Display confirmation dialog box if environment is not satisfied
        setIsInitializing(false);
        setEnvironmentReady(false);

        // Use confirmAlert and handle the return value
        const confirmed = await confirmAlert({
          title: "Environment Not Ready",
          message: requirementsMessage,
          primaryAction: {
            title: "Open WeChatTweak Manager",
          },
          dismissAction: {
            title: "Cancel",
          },
        });

        // If the user clicks the primary action button, open the Manage WeChatTweak command
        if (confirmed) {
          await openManageTweak();
        }

        return;
      }

      // All conditions are met
      setEnvironmentReady(true);
      setIsInitializing(false);
    } catch (error) {
      console.error("Error checking requirements:", error);
      setIsInitializing(false);
      setEnvironmentReady(false);

      // Displays an error message and provides an option to open the management interface
      const confirmed = await confirmAlert({
        title: "Error Checking Requirements",
        message: `An error occurred while checking requirements: ${error}. Would you like to open WeChatTweak Manager to fix this issue?`,
        primaryAction: {
          title: "Open WeChatTweak Manager",
        },
        dismissAction: {
          title: "Cancel",
        },
      });

      if (confirmed) {
        await openManageTweak();
      }
    }
  };

  const loadPinnedContacts = async () => {
    try {
      const contacts = await storageService.getPinnedContacts();
      setPinnedContacts(contacts);
    } catch (error) {
      console.error("Error loading pinned contacts:", error);
    }
  };

  if (isInitializing) {
    return (
      <List isLoading={true}>
        <List.EmptyView
          title="Checking requirements..."
          description="Please wait while we check WeChat and WeChatTweak installation."
        />
      </List>
    );
  }

  if (!environmentReady) {
    return (
      <List>
        <List.EmptyView
          title="Environment not ready"
          description="WeChat or WeChatTweak is not properly set up. Please use the WeChatTweak Manager to fix this issue."
          actions={
            <ActionPanel>
              <ActionPanel.Item title="Open WeChatTweak Manager" onAction={openManageTweak} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={state.isLoading}
      onSearchTextChange={search}
      searchBarPlaceholder="Search WeChat contacts (supports Chinese, Pinyin, mixed search)..."
      throttle
    >
      {pinnedContacts.length > 0 && (
        <List.Section title="Pinned Contacts" subtitle={String(pinnedContacts.length)}>
          {pinnedContacts.map((contact) => (
            <SearchListItem
              key={`pinned-${contact.arg}`}
              searchResult={contact}
              isPinned={true}
              onTogglePin={async () => {
                const newPinnedContacts = pinnedContacts.filter((c) => c.arg !== contact.arg);
                setPinnedContacts(newPinnedContacts);
                await storageService.setPinnedContacts(newPinnedContacts);
              }}
              onClearHistory={clearRecentContacts}
            />
          ))}
        </List.Section>
      )}

      {state.recentContacts.length > 0 && state.searchText === "" && (
        <List.Section title="Recent Contacts" subtitle={String(state.recentContacts.length)}>
          {state.recentContacts.map((contact) => {
            const isAlreadyPinned = pinnedContacts.some((pinned) => pinned.arg === contact.arg);
            if (isAlreadyPinned) {
              return null;
            }

            return (
              <SearchListItem
                key={`recent-${contact.arg}`}
                searchResult={contact}
                isPinned={false}
                onTogglePin={async () => {
                  const newPinnedContacts = [...pinnedContacts, contact];
                  setPinnedContacts(newPinnedContacts);
                  await storageService.setPinnedContacts(newPinnedContacts);
                }}
                onClearHistory={clearRecentContacts}
              />
            );
          })}
        </List.Section>
      )}

      <List.Section title="Contacts" subtitle={String(state.items.length)}>
        {state.items.map((searchResult) => {
          const isAlreadyPinned = pinnedContacts.some((contact) => contact.arg === searchResult.arg);
          if (isAlreadyPinned) {
            return null;
          }

          return (
            <SearchListItem
              key={searchResult.arg}
              searchResult={searchResult}
              isPinned={false}
              onTogglePin={async () => {
                const newPinnedContacts = [...pinnedContacts, searchResult];
                setPinnedContacts(newPinnedContacts);
                await storageService.setPinnedContacts(newPinnedContacts);
              }}
              onClearHistory={clearRecentContacts}
            />
          );
        })}
      </List.Section>
    </List>
  );
}

import { ActionPanel } from "@raycast/api";
