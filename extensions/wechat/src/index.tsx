import {
  Action,
  ActionPanel,
  AI,
  Clipboard,
  confirmAlert,
  launchCommand,
  LaunchType,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { SearchListItem } from "./components/searchListltem";
import { useSearch } from "./hooks/useSearch";
import { storageService } from "./services/storageService";
import { SearchResult } from "./types";
import { WeChatManager } from "./utils/wechatManager";

export default function Command() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [environmentReady, setEnvironmentReady] = useState(false);
  const { state, search, clearRecentContacts, setSearchResults } = useSearch();
  const [pinnedContacts, setPinnedContacts] = useState<SearchResult[]>([]);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiQuery, setAiQuery] = useState("");

  useEffect(() => {
    checkRequirements();
    loadPinnedContacts();
  }, []);

  // Handle AI query
  useEffect(() => {
    if (aiQuery && environmentReady && !aiProcessing) {
      processAiQuery(aiQuery);
      // Reset aiQuery to avoid repeated processing
      setAiQuery("");
    }
  }, [aiQuery, environmentReady, aiProcessing]);

  // Analyze query intent and extract search keywords
  const processAiQuery = async (text: string) => {
    if (!text) return;

    setAiProcessing(true);
    try {
      console.log("Processing AI query:", text);

      // Use AI to extract search intent and conditions
      const response = await AI.ask(`
        Analyze the following WeChat contact search query and extract search conditions and keywords.
        
        Query: "${text}"
        
        If searching for a surname, return format: {"type": "surname", "value": "surname"}
        If searching for names containing specific characters, return format: {"type": "contains", "value": "characters"}
        If searching for names of a specific length, return format: {"type": "length", "value": number}
        If it's another search condition, return format: {"type": "keyword", "value": "keyword"}
        If search intent cannot be recognized, return: {"type": "unknown"}
        
        Return only JSON format, don't add any other text.
      `);

      console.log("AI response:", response);

      try {
        // Parse the JSON returned by AI
        const searchIntent = JSON.parse(response.trim());
        console.log("Parsed search intent:", searchIntent);

        if (searchIntent.type === "unknown") {
          // If search intent cannot be recognized, use the original query
          console.log("Unrecognized search intent, using original query:", text);
          search(text);
          return;
        }

        // Execute different search logic based on the search type
        switch (searchIntent.type) {
          case "surname":
            // Search by surname
            console.log("Executing surname search:", searchIntent.value);
            performSurnameSearch(searchIntent.value);
            break;
          case "contains":
            // Search for names containing specific characters
            console.log("Executing contains search:", searchIntent.value);
            performContainsSearch(searchIntent.value);
            break;
          case "length":
            // Search for names of a specific length
            console.log("Executing length search:", searchIntent.value);
            performLengthSearch(parseInt(searchIntent.value));
            break;
          default:
            // Default keyword search
            console.log("Executing default keyword search:", searchIntent.value);
            search(searchIntent.value);
            break;
        }

        await showToast({
          style: Toast.Style.Success,
          title: `AI Search`,
          message: `Search condition: ${searchIntent.value}`,
        });
      } catch (jsonError) {
        // If JSON parsing fails, use the original query
        console.error("Failed to parse AI response:", jsonError);
        search(text);
      }
    } catch (error) {
      console.error("AI processing error:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "AI Processing Failed",
        message: String(error),
      });
      // Fall back to regular search on failure
      search(text);
    } finally {
      setAiProcessing(false);
    }
  };

  // Search by surname
  const performSurnameSearch = (surname: string) => {
    // Use the original search function
    search(surname);
  };

  // Search for names containing specific characters
  const performContainsSearch = (keyword: string) => {
    // Use the original search function
    search(keyword);
  };

  // Search for names of a specific length
  const performLengthSearch = (length: number) => {
    // Get all contacts
    const allContacts = state.items;

    // Filter contacts with names of the specific length
    const filteredContacts = allContacts.filter((contact) => {
      // Remove non-Chinese characters and calculate length
      const chineseName = contact.title.replace(/[^\u4e00-\u9fa5]/g, "");
      return chineseName.length === length;
    });

    // If matching contacts are found, use setSearchResults to display all of them
    if (filteredContacts.length > 0) {
      // Use the new setSearchResults function to directly set the filtered results
      setSearchResults(`${length} character names`, filteredContacts);

      // Show a success toast with the number of matching contacts
      showToast({
        style: Toast.Style.Success,
        title: "Search Results",
        message: `Found ${filteredContacts.length} contacts with ${length} Chinese characters in name`,
      });
    } else {
      // If no matches are found, display a notification
      showToast({
        style: Toast.Style.Failure,
        title: "No Matching Contacts",
        message: `No contacts found with ${length} Chinese characters in name`,
      });
      // Clear search results
      search("");
    }
  };

  // Generate AI conversation content
  const generateAiMessage = async (contactName: string) => {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "AI Generating Message...",
      });

      const response = await AI.ask(`
        Please generate a WeChat message to send to ${contactName}.
        Generate a natural, friendly, and concise message.
        Provide only the message content without any prefix or explanation.
      `);

      // Copy to Clipboard
      await Clipboard.copy(response.trim());

      await showToast({
        style: Toast.Style.Success,
        title: "Message Generated",
        message: "Content copied to clipboard",
      });
    } catch (error) {
      console.error("Failed to generate AI message:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to generate message",
        message: String(error),
      });
    }
  };

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
        title: "Unable to open WeChat Tweak Manager",
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
        requirementsMessage = "WeChat is not installed. Open WeChatTweak Manager to install it?";
        shouldOpenManager = true;
      }
      // Check if WeChat is running
      else if (!WeChatManager.isWeChatRunning()) {
        requirementsMessage = "WeChat is not running. Do you want to open WeChatTweak Manager to start it?";
        shouldOpenManager = true;
      }
      // Check if WeChatTweak is installed
      else if (!WeChatManager.isWeChatTweakInstalled()) {
        requirementsMessage = "WeChatTweak is not installed. Open WeChatTweak Manager to install it?";
        shouldOpenManager = true;
      }
      // Check if WeChatTweak service is running
      else {
        try {
          const isServiceRunning = await WeChatManager.isWeChatServiceRunning();
          if (!isServiceRunning) {
            requirementsMessage = "WeChat service is not running. Open WeChat Tweak Manager to fix this problem?";
            shouldOpenManager = true;
          }
        } catch (serviceError) {
          console.error("Error checking WeChat service:", serviceError);
          requirementsMessage = "Checking WeChat service failed. Open WeChat Tweak Manager to fix this?";
          shouldOpenManager = true;
        }
      }

      if (shouldOpenManager) {
        // If the environment is not satisfied, a confirmation dialog box is displayed
        setIsInitializing(false);
        setEnvironmentReady(false);

        // Use confirmAlert and handle the return value
        const confirmed = await confirmAlert({
          title: "Environment not ready",
          message: requirementsMessage,
          primaryAction: {
            title: "Open WeChat Tweak Manager",
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

      // Display an error message and provide an option to open the management interface
      const confirmed = await confirmAlert({
        title: "Error checking request",
        message: `An error occurred while checking requirements: ${error}. Open WeChatTweak Manager to fix this?`,
        primaryAction: {
          title: "Open WeChat Tweak Manager",
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
          description="WeChat or WeChatTweak is not set up correctly. Please use WeChatTweak Manager to resolve this issue."
          actions={
            <ActionPanel.Section>
              <Action
                title="Open WeChatTweak Manager"
                icon="wechat.png"
                onAction={async () => {
                  await openManageTweak();
                }}
              />
            </ActionPanel.Section>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={state.isLoading || aiProcessing}
      onSearchTextChange={(text) => {
        const AI_SEARCH_TRIGGERS = [
          "search",
          "find",
          "look for",
          "surname",
          "name",
          "characters",
          "搜索",
          "查找",
          "找",
          "姓",
          "名字",
          "几个字",
          "几位",
        ];
        const hasAiTrigger =
          AI_SEARCH_TRIGGERS.some((trigger) => text.toLowerCase().includes(trigger)) || /^[0-9]+[个位]字?/.test(text);

        if (hasAiTrigger) {
          // If it's an AI query, set the aiQuery state
          setAiQuery(text);
        } else {
          // Otherwise use regular search
          search(text);
        }
      }}
      searchBarPlaceholder="Support name, pinyin, or AI natural language search..."
      throttle
    >
      {pinnedContacts.length > 0 && (
        <List.Section title="Pin Contact" subtitle={String(pinnedContacts.length)}>
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
              onGenerateAiMessage={() => generateAiMessage(contact.title)}
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
                onGenerateAiMessage={() => generateAiMessage(contact.title)}
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
              onGenerateAiMessage={() => generateAiMessage(searchResult.title)}
            />
          );
        })}
      </List.Section>
    </List>
  );
}
