import { List, Icon, Color, Detail, ActionPanel, Action, Keyboard, showToast, Toast } from "@raycast/api";
import { useV0Api } from "../hooks/useV0Api";
import type { ChatDetailResponse, ChatMetadataResponse } from "../types";
import AddMessage from "./AddMessage";
import { useActiveProfile } from "../hooks/useActiveProfile";
import { useState, useEffect } from "react";
import ChatFilesDetail from "./ChatFilesDetail";
import { parseV0ApiResponseBody } from "../lib/v0-api-utils";

export default function ChatDetail({ chatId, scopeId }: { chatId: string; scopeId?: string }) {
  const { activeProfileApiKey, isLoadingProfileDetails, activeProfileDefaultScope } = useActiveProfile();
  const [messageFilter, setMessageFilter] = useState<"all" | "user" | "v0">("all");

  const { isLoading, data, error, mutate } = useV0Api<ChatDetailResponse | null>(
    activeProfileApiKey ? `https://api.v0.dev/v1/chats/${chatId}` : "",
    {
      headers: {
        Authorization: `Bearer ${activeProfileApiKey}`,
        "Content-Type": "application/json",
        "x-scope": scopeId || activeProfileDefaultScope || "",
      },
      parseResponse: async (response) => {
        if (response.status === 404) {
          // Suppress transient 404s by returning null; we will retry manually
          return null as unknown as ChatDetailResponse;
        }
        return parseV0ApiResponseBody<ChatDetailResponse>(response);
      },
      execute: !!activeProfileApiKey && !isLoadingProfileDetails,
    },
  );

  // If chat was just created, API may return 404 briefly. Retry every 2s up to 3 times.
  const [notFoundRetries, setNotFoundRetries] = useState(0);
  const [shownFinalErrorToast, setShownFinalErrorToast] = useState(false);
  useEffect(() => {
    if (data === null && notFoundRetries < 3) {
      const delayMs = 2000; // constant 2s retries
      const timer = setTimeout(() => {
        setNotFoundRetries((v) => v + 1);
        mutate();
      }, delayMs);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [data, mutate, notFoundRetries]);

  // After third retry fails, show a single failure toast.
  useEffect(() => {
    if (data === null && notFoundRetries >= 3 && !shownFinalErrorToast) {
      setShownFinalErrorToast(true);
      void showToast({ style: Toast.Style.Failure, title: "Failed to load chat", message: "Chat not found" });
    }
  }, [data, notFoundRetries, shownFinalErrorToast]);

  const { data: metadata } = useV0Api<ChatMetadataResponse | null>(
    activeProfileApiKey ? `https://api.v0.dev/v1/chats/${chatId}/metadata` : "",
    {
      headers: {
        Authorization: `Bearer ${activeProfileApiKey}`,
        "x-scope": scopeId || activeProfileDefaultScope || "",
      },
      parseResponse: async (response) => {
        if (response.status === 404) {
          return null as unknown as ChatMetadataResponse;
        }
        return parseV0ApiResponseBody<ChatMetadataResponse>(response);
      },
      execute: !!activeProfileApiKey && !isLoadingProfileDetails,
    },
  );

  if (data === null) {
    if (notFoundRetries < 3) {
      return (
        <List navigationTitle="Chat Detail">
          <List.EmptyView title="Finalizing chat..." description="Just a moment while we load your chat." />
        </List>
      );
    }
    return <Detail markdown={`# Error\n\nChat not found`} />;
  }

  if (error) {
    return <Detail markdown={`# Error\n\n${(error as Error)?.message}`} />;
  }

  if (isLoading || isLoadingProfileDetails) {
    return (
      <List navigationTitle="Chat Detail">
        <List.EmptyView title="Loading..." description="Fetching chat messages..." />
      </List>
    );
  }

  const isUserMessage = (messageRole: string) => {
    // Only "message" type is from the user, all other types are v0 responses
    return messageRole === "user";
  };

  const getMessageIcon = (messageRole: string) => {
    if (isUserMessage(messageRole)) {
      return { source: Icon.Person, tintColor: Color.SecondaryText };
    }
    return { source: Icon.Cog, tintColor: Color.SecondaryText };
  };

  const formatPreviewContent = (content: string) => {
    const maxLength = 100;
    let previewContent = content.replace(/<Thinking>/g, "");
    previewContent = previewContent.replace(/<\/Thinking>/g, " ");
    // Remove other tags that might not be relevant for a short preview
    previewContent = previewContent.replace(/<CodeProject[^>]*>[\s\S]*?<\/CodeProject>/g, "");
    previewContent = previewContent.replace(/<Actions>[\s\S]*?<\/Actions>/g, "");
    previewContent = previewContent.replace(
      /<V0LaunchTasks>[\s\S]*?<V0Task[^>]*taskNameActive="([^"]*)"[^>]*?\/>[\s\S]*?<\/V0LaunchTasks>/g,
      "**v0 is working on:** $1 ",
    );
    previewContent = previewContent.replace(
      /<V0LaunchTasks>[\s\S]*?<V0Task[^>]*taskNameComplete="([^"]*)"[^>]*?\/>[\s\S]*?<\/V0LaunchTasks>/g,
      "**v0 has completed:** $1 ",
    );
    previewContent = previewContent.replace(/<V0LaunchTasks>[\s\S]*?<\/V0LaunchTasks>/g, "");

    // Remove newlines for a single-line preview display
    previewContent = previewContent.replace(/\n/g, " ");

    if (previewContent.length <= maxLength) {
      return previewContent.trim();
    }
    return `${previewContent.substring(0, maxLength).trim()}...`;
  };

  const getMessagePreview = (content: string) => {
    // Use the dedicated preview formatting function
    const previewContent = formatPreviewContent(content);
    return previewContent;
  };

  const formatFullMessageContent = (content: string) => {
    let formattedContent = content.replace(/<Thinking>/g, "🧠\n");
    formattedContent = formattedContent.replace(/<\/Thinking>/g, "\n\n");
    formattedContent = formattedContent.replace(/<CodeProject[^>]*>[\s\S]*?<\/CodeProject>/g, "");
    formattedContent = formattedContent.replace(/<Actions>[\s\S]*?<\/Actions>/g, "");
    // Handle V0LaunchTasks
    formattedContent = formattedContent.replace(
      /<V0LaunchTasks>[\s\S]*?<V0Task[^>]*taskNameActive="([^"]*)"[^>]*?\/>[\s\S]*?<\/V0LaunchTasks>/g,
      "**v0 is working on:** $1\n",
    );
    formattedContent = formattedContent.replace(
      /<V0LaunchTasks>[\s\S]*?<V0Task[^>]*taskNameComplete="([^"]*)"[^>]*?\/>[\s\S]*?<\/V0LaunchTasks>/g,
      "**v0 has completed:** $1\n",
    );
    formattedContent = formattedContent.replace(/<V0LaunchTasks>[\s\S]*?<\/V0LaunchTasks>/g, "");

    return formattedContent.trim();
  };

  return (
    <List
      navigationTitle={data?.name || "Untitled Chat"}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Message Type"
          onChange={(newValue) => setMessageFilter(newValue as "all" | "user" | "v0")}
          value={messageFilter}
        >
          <List.Dropdown.Item title="All Messages" value="all" icon={Icon.Message} />
          <List.Dropdown.Item title="Your Messages" value="user" icon={Icon.Person} />
          <List.Dropdown.Item title="v0 Messages" value="v0" icon={Icon.Cog} />
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="Add Message"
              target={
                <AddMessage
                  chatId={chatId}
                  scopeId={scopeId}
                  revalidateChats={mutate}
                  chatTitle={data?.name || "Untitled Chat"}
                />
              }
              icon={Icon.Plus}
              shortcut={Keyboard.Shortcut.Common.New}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      {(data?.messages ?? [])
        .filter((message) => {
          if (messageFilter === "all") return true;
          return messageFilter === "user" ? isUserMessage(message.role) : !isUserMessage(message.role);
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map((message) => (
          <List.Item
            key={message.id}
            // title={getMessageTitle(message.role)}
            title={getMessagePreview(message.content)}
            accessories={[
              { date: new Date(message.createdAt || ""), tooltip: "Message timestamp" },
              {
                icon: getMessageIcon(message.role),
                tooltip: `${message.role === "user" ? "You" : "v0"} sent this message`,
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Full Message"
                  target={
                    <Detail
                      markdown={formatFullMessageContent(message.content)}
                      metadata={
                        <Detail.Metadata>
                          <Detail.Metadata.Label title="Sent at" text={new Date(message.createdAt).toLocaleString()} />
                          <Detail.Metadata.Label title="From" text={`${message.role === "user" ? "You" : "v0"}`} />
                          <Detail.Metadata.Label title="Type" text={message.type} />
                          {metadata?.project?.name && (
                            <Detail.Metadata.Link
                              title="Project"
                              text={metadata.project.name}
                              target={metadata.project.url || ""}
                            />
                          )}
                          {metadata?.git?.branch && (
                            <Detail.Metadata.Label title="Git Branch" text={metadata.git.branch} />
                          )}
                          {metadata?.git?.commit && (
                            <Detail.Metadata.Label title="Git Commit" text={metadata.git.commit} />
                          )}
                          {metadata?.deployment?.id && (
                            <Detail.Metadata.Label title="Deployment ID" text={metadata.deployment.id} />
                          )}
                        </Detail.Metadata>
                      }
                    />
                  }
                  icon={Icon.Eye}
                />
                <Action.OpenInBrowser
                  icon={Icon.Globe}
                  title="View Chat in Browser"
                  url={`https://v0.dev/chat/${chatId}`}
                  shortcut={Keyboard.Shortcut.Common.Open}
                />
                {data?.latestVersion?.files && data.latestVersion.files.length > 0 && (
                  <Action.Push
                    title="View Latest Files"
                    icon={Icon.Document}
                    target={<ChatFilesDetail files={data.latestVersion.files} />}
                    shortcut={{ modifiers: ["cmd"], key: "f" }}
                  />
                )}
                <Action.Push
                  title="Add Message"
                  target={
                    <AddMessage
                      chatId={chatId}
                      scopeId={scopeId}
                      revalidateChats={mutate}
                      chatTitle={data?.name || "Untitled Chat"}
                    />
                  }
                  icon={Icon.Plus}
                  shortcut={Keyboard.Shortcut.Common.New}
                />
                {data?.latestVersion?.demoUrl && (
                  <Action.OpenInBrowser
                    title="View Demo"
                    icon={Icon.Play}
                    url={data.latestVersion.demoUrl}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                  />
                )}
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
