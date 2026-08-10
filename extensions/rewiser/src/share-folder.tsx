import {
  Detail,
  ActionPanel,
  Action,
  showToast,
  Toast,
  List,
  Icon,
  Color,
  Clipboard,
  getPreferenceValues,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState, useCallback } from "react";
import { fetchFolders, createShareLink, ApiError } from "./utils/api";
import { Folder } from "./utils/types";
import { logger } from "./utils/logger";

interface Preferences {
  personalAccessToken: string;
}

export default function Command() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [creatingLinks, setCreatingLinks] = useState<Set<string>>(new Set());

  const initializeAuth = useCallback(async () => {
    try {
      const preferences = getPreferenceValues<Preferences>();
      const personalToken = preferences.personalAccessToken;

      if (!personalToken?.trim()) {
        throw new Error("Personal Access Token is required. Please set it in extension preferences.");
      }

      setToken(personalToken);
      await loadFolders(personalToken);
    } catch (error) {
      logger.error("Initialization error", error);
      setToken(null);
      await showFailureToast(error instanceof Error ? error.message : "Failed to initialize extension");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFolders = useCallback(async (authToken: string) => {
    try {
      const foldersData = await fetchFolders(authToken);
      setFolders(foldersData);
    } catch (error) {
      logger.error("Failed to load folders", error);
    }
  }, []);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  const handleCreateShareLink = useCallback(
    async (folder: Folder) => {
      if (!token) {
        await showFailureToast("Authentication required");
        return;
      }

      const folderId = folder.id || folder.key;

      // Prevent multiple simultaneous requests for same folder
      if (creatingLinks.has(folderId)) {
        return;
      }

      setCreatingLinks((prev) => new Set(prev).add(folderId));

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Creating share link...",
        message: `For ${folder.label}`,
      });

      try {
        const newShareLink = await createShareLink(token, folderId);

        // Copy to clipboard
        await Clipboard.copy(newShareLink.share_url);

        toast.style = Toast.Style.Success;
        toast.title = "Share link created!";
        toast.message = "Link copied to clipboard";

        // Show the link in a follow-up toast
        setTimeout(() => {
          showToast({
            style: Toast.Style.Success,
            title: folder.label,
            message: newShareLink.share_url,
          });
        }, 2000);
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to create share link";

        if (error instanceof ApiError) {
          toast.message = error.message;
        } else {
          toast.message = "Unknown error occurred";
        }

        logger.error("Failed to create share link", error);
      } finally {
        setCreatingLinks((prev) => {
          const newSet = new Set(prev);
          newSet.delete(folderId);
          return newSet;
        });
      }
    },
    [token, creatingLinks],
  );

  if (loading) {
    return <Detail isLoading={true} navigationTitle="Loading folders..." />;
  }

  if (!token) {
    return (
      <Detail
        navigationTitle="Configuration Required"
        markdown={`# Personal Access Token Required
        
Please set your Rewiser Personal Access Token in the extension preferences.
        
1. Open Raycast preferences
2. Go to Extensions → Rewiser
3. Enter your Personal Access Token
        
To get your token:
1. Visit [app.rewiser.io](https://app.rewiser.io)
2. Go to Profile → API Keys
3. Create a new Personal Access Token`}
      />
    );
  }

  return (
    <List navigationTitle="Share Folder" searchBarPlaceholder="Search folders...">
      <List.Section title="Select a folder to share">
        {folders.map((folder) => {
          const folderId = folder.id || folder.key;
          const isPersonal = folder.label.toLowerCase() === "personal";
          const isCreating = creatingLinks.has(folderId);

          return (
            <List.Item
              key={folderId}
              title={folder.label}
              subtitle={isPersonal ? "Cannot be shared" : "Press Enter to create share link"}
              icon={{
                source: isPersonal ? Icon.Lock : Icon.Folder,
                tintColor: isPersonal ? Color.SecondaryText : isCreating ? Color.Orange : Color.Blue,
              }}
              accessories={
                isCreating
                  ? [
                      {
                        icon: Icon.Clock,
                        tooltip: "Creating share link...",
                      },
                    ]
                  : []
              }
              actions={
                !isPersonal ? (
                  <ActionPanel>
                    <Action title="Create Share Link" icon={Icon.Link} onAction={() => handleCreateShareLink(folder)} />
                    <Action
                      title="Refresh Folders"
                      icon={Icon.ArrowClockwise}
                      onAction={() => loadFolders(token!)}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                  </ActionPanel>
                ) : (
                  <ActionPanel>
                    <Action
                      title="Refresh Folders"
                      icon={Icon.ArrowClockwise}
                      onAction={() => loadFolders(token!)}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                  </ActionPanel>
                )
              }
            />
          );
        })}
      </List.Section>

      {folders.length === 0 && (
        <List.EmptyView
          title="No folders found"
          description="Create folders in your Rewiser account to share them"
          icon={Icon.Folder}
        />
      )}
    </List>
  );
}
