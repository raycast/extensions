import { ActionPanel, Detail, List, Action, Icon, showToast, Toast, confirmAlert } from "@raycast/api";
import type { ChatSummary, FindChatsResponse, ForkChatResponse, ProjectChatsResponse } from "./types";
import ChatDetail from "./components/ChatDetail";
import AddMessage from "./components/AddMessage";
import { useNavigation } from "@raycast/api";
import AssignProjectForm from "./components/AssignProjectForm";
import { useState, useEffect, useCallback } from "react";
import UpdateChatPrivacyForm from "./components/UpdateChatPrivacyForm";
import { useActiveProfile } from "./hooks/useActiveProfile";
import { useScopes } from "./hooks/useScopes";
import { ScopeDropdown } from "./components/ScopeDropdown";
import { useV0Api } from "./hooks/useV0Api";
import { v0ApiFetcher, V0ApiError } from "./lib/v0-api-utils";
import ChatMetadataDetail from "./components/ChatMetadataDetail";
import { useProjects } from "./hooks/useProjects";

export default function Command(props: { scopeId?: string; projectId?: string }) {
  const { push } = useNavigation();
  const { activeProfileApiKey, activeProfileDefaultScope, isLoadingProfileDetails } = useActiveProfile();
  const { projects } = useProjects();

  const [selectedScopeFilter, setSelectedScopeFilter] = useState<string | null>(props.scopeId || null);

  const getProjectName = useCallback(
    (projectId: string) => {
      const project = projects.find((p) => p.id === projectId);
      return project?.name || undefined;
    },
    [projects],
  );

  useEffect(() => {
    // Update selectedScopeFilter when defaultScope becomes available or props.scopeId changes
    if (activeProfileDefaultScope !== null && !isLoadingProfileDetails && !props.scopeId) {
      setSelectedScopeFilter(activeProfileDefaultScope);
    }
  }, [activeProfileDefaultScope, isLoadingProfileDetails, props.scopeId]);

  const { isLoading, data, error, mutate } = useV0Api<FindChatsResponse | ProjectChatsResponse>(
    activeProfileApiKey && !isLoadingProfileDetails
      ? props.projectId
        ? `https://api.v0.dev/v1/projects/${props.projectId}`
        : "https://api.v0.dev/v1/chats"
      : "",
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${activeProfileApiKey}`,
        "x-scope": selectedScopeFilter || "",
      },
      keepPreviousData: true,
      execute: !!activeProfileApiKey && !isLoadingProfileDetails,
    },
  );

  const { scopes: scopesData, isLoadingScopes } = useScopes(activeProfileApiKey);

  const chats = props.projectId ? (data as ProjectChatsResponse)?.chats || [] : (data as FindChatsResponse)?.data || [];

  const deleteChat = async (chatId: string, chatTitle: string) => {
    if (!activeProfileApiKey) {
      showToast(Toast.Style.Failure, "API Key not available.");
      return;
    }
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Deleting chat...",
    });

    try {
      await mutate(
        v0ApiFetcher(`https://api.v0.dev/v1/chats/${chatId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${activeProfileApiKey}`,
            "x-scope": activeProfileDefaultScope || "",
          },
        }),
        {
          optimisticUpdate(data: FindChatsResponse | ProjectChatsResponse): FindChatsResponse | ProjectChatsResponse {
            const updatedData = { ...data };
            if ("data" in updatedData) {
              updatedData.data = updatedData.data.filter((chat) => chat.id !== chatId);
            } else if ("chats" in updatedData) {
              updatedData.chats = updatedData.chats.filter((chat) => chat.id !== chatId);
            }
            return updatedData;
          },
          rollbackOnError: true,
        },
      );

      toast.style = Toast.Style.Success;
      toast.title = "Chat Deleted";
      toast.message = `"${chatTitle}" has been deleted successfully.`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Delete Failed";
      toast.message = error instanceof V0ApiError ? error.response.error.message : "Failed to delete chat";
    }
  };

  const favoriteChat = async (chatId: string, isFavorite: boolean) => {
    if (!activeProfileApiKey) {
      showToast(Toast.Style.Failure, "API Key not available.");
      return;
    }
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: isFavorite ? "Favoriting chat..." : "Unfavoriting chat...",
    });

    try {
      await mutate(
        v0ApiFetcher(`https://api.v0.dev/v1/chats/${chatId}/favorite`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${activeProfileApiKey}`,
          },
          body: { isFavorite },
        }),
        {
          optimisticUpdate(data: FindChatsResponse | ProjectChatsResponse): FindChatsResponse | ProjectChatsResponse {
            const updatedData = { ...data };
            if ("data" in updatedData) {
              updatedData.data = updatedData.data.map((chat: ChatSummary) =>
                chat.id === chatId ? { ...chat, favorite: isFavorite } : chat,
              );
            } else if ("chats" in updatedData) {
              updatedData.chats = updatedData.chats.map((chat: ChatSummary) =>
                chat.id === chatId ? { ...chat, favorite: isFavorite } : chat,
              );
            }
            return updatedData;
          },
          rollbackOnError: true,
        },
      );
      toast.style = Toast.Style.Success;
      toast.title = isFavorite ? "Chat Favorited" : "Chat Unfavorited";
      toast.message = `Chat has been ${isFavorite ? "favorited" : "unfavorited"} successfully.`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Favorite Failed";
      toast.message = error instanceof V0ApiError ? error.response.error.message : "Failed to favorite chat";
    }
  };

  const forkChat = async (chat: ChatSummary) => {
    if (!activeProfileApiKey) {
      showToast(Toast.Style.Failure, "API Key not available.");
      return;
    }
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Forking chat...",
    });

    try {
      const requestBody = chat.latestVersion?.id ? { versionId: chat.latestVersion.id } : {};
      const newChatResponse = await v0ApiFetcher<ForkChatResponse>(`https://api.v0.dev/v1/chats/${chat.id}/fork`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${activeProfileApiKey}`,
        },
        body: requestBody,
      });

      // Navigate to the new chat detail
      push(<ChatDetail chatId={newChatResponse.id} />);

      toast.style = Toast.Style.Success;
      toast.title = "Chat Forked";
      toast.message = `"${chat.title}" has been forked successfully!`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Fork Failed";
      toast.message = error instanceof V0ApiError ? error.response.error.message : "Failed to fork chat";
    }
  };

  if (error) {
    return <Detail markdown={`Error: ${error?.message}`} />;
  }

  if (isLoading || isLoadingProfileDetails || isLoadingScopes) {
    return (
      <List navigationTitle="v0 Chats">
        <List.EmptyView title="Fetching your chats..." />
      </List>
    );
  }

  const project = props.projectId ? projects.find((p) => p.id === props.projectId) : undefined;

  return (
    <List
      navigationTitle="v0 Chats"
      searchBarPlaceholder={
        props.projectId ? `Search chats in "${project?.name || "Unknown Project"}"...` : "Search your chats..."
      }
      searchBarAccessory={
        props.projectId ? null : (
          <ScopeDropdown
            selectedScope={selectedScopeFilter}
            onScopeChange={setSelectedScopeFilter}
            availableScopes={scopesData || []}
            isLoadingScopes={isLoadingScopes}
          />
        )
      }
    >
      {chats
        .sort((a, b) => {
          // Sort favorited chats to the top
          if (a.favorite && !b.favorite) return -1;
          if (!a.favorite && b.favorite) return 1;
          // Maintain original order for non-favorited chats, or sort by updatedAt for favorited chats
          return new Date(b.updatedAt || "").getTime() - new Date(a.updatedAt || "").getTime();
        })
        .map((chat) => (
          <List.Item
            key={chat.id}
            title={chat.name || "Untitled Chat"}
            subtitle={chat.projectId ? getProjectName(chat.projectId) : undefined}
            accessories={[
              ...(chat.favorite ? [{ icon: Icon.Star, tooltip: "Favorite" }] : []),
              ...(chat.latestVersion?.demoUrl ? [{ icon: Icon.Window, tooltip: "Has Preview" }] : []),
              ...(chat.privacy === "private" ? [{ icon: Icon.Lock, tooltip: "Private" }] : []),
              ...(chat.privacy === "public" ? [{ icon: Icon.Globe, tooltip: "Public" }] : []),
              ...(chat.privacy === "team" ? [{ icon: Icon.TwoPeople, tooltip: "Team" }] : []),
              ...(chat.privacy === "unlisted" ? [{ icon: Icon.EyeDisabled, tooltip: "Unlisted" }] : []),
              ...(chat.privacy === "team-edit" ? [{ icon: Icon.CheckRosette, tooltip: "Team Edit" }] : []),
              { date: new Date(chat.updatedAt || ""), tooltip: "Last updated" },
            ]}
            actions={
              <ActionPanel>
                <Action.Push title="View Messages" target={<ChatDetail chatId={chat.id} />} icon={Icon.Message} />
                <Action.Push
                  title="Add Message"
                  target={<AddMessage chatId={chat.id} chatTitle={chat.name} revalidateChats={mutate} />}
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                />
                {chat.latestVersion?.id && (
                  <Action
                    title="Fork Chat"
                    icon={Icon.Duplicate}
                    onAction={() => forkChat(chat)}
                    shortcut={{ modifiers: ["opt"], key: "f" }}
                  />
                )}
                <Action
                  title={chat.favorite ? "Unfavorite Chat" : "Favorite Chat"}
                  icon={chat.favorite ? Icon.StarDisabled : Icon.Star}
                  onAction={() => favoriteChat(chat.id, !chat.favorite)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                />
                <Action.Push
                  title="Update Chat Privacy"
                  icon={Icon.Lock}
                  target={
                    <UpdateChatPrivacyForm chatId={chat.id} currentPrivacy={chat.privacy} revalidateChats={mutate} />
                  }
                  shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                />
                <ActionPanel.Section>
                  <Action.Push
                    title="Assign Project"
                    icon={Icon.Folder}
                    target={<AssignProjectForm chat={chat} revalidateChats={mutate} />}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                  />
                  {chat.projectId && (
                    <Action.Push
                      title="Show All Project Chats"
                      icon={Icon.Bubble}
                      target={<Command projectId={chat.projectId} />}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                    />
                  )}
                </ActionPanel.Section>
                <ActionPanel.Section>
                  {chat.latestVersion?.demoUrl && (
                    <Action.OpenInBrowser
                      url={chat.latestVersion.demoUrl}
                      title="View Demo"
                      icon={Icon.Window}
                      shortcut={{ modifiers: ["cmd"], key: "i" }}
                    />
                  )}
                  <Action.OpenInBrowser
                    url={`https://v0.dev/chat/${chat.id}`}
                    title="View Chat in Browser"
                    icon={Icon.Globe}
                    shortcut={{ modifiers: ["cmd"], key: "b" }}
                  />
                  <Action.Push
                    title="View Metadata"
                    icon={Icon.Tag}
                    target={<ChatMetadataDetail chat={chat} />}
                    shortcut={{ modifiers: ["cmd"], key: "m" }}
                  />
                  <Action.CopyToClipboard
                    content={chat.id}
                    title="Copy Chat ID"
                    icon={Icon.CopyClipboard}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  {chat.projectId && !!getProjectName(chat.projectId) && (
                    <Action.CopyToClipboard
                      content={chat.projectId || ""}
                      title="Copy Project ID"
                      icon={Icon.CopyClipboard}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    />
                  )}
                  <Action
                    title="Delete Chat"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={async () => {
                      if (
                        await confirmAlert({
                          title: `Delete "${chat.name || chat.title || "Untitled Chat"}"?`,
                          message:
                            "The chat will be deleted and removed from your chat history. This action cannot be undone.",
                        })
                      ) {
                        deleteChat(chat.id, chat.name || chat.title || "Untitled Chat");
                      }
                    }}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
