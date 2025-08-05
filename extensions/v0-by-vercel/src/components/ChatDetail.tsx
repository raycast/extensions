import { List, Icon, Color, Detail, ActionPanel, Action } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import type { ChatDetailResponse, ChatMetadataResponse } from "../types";
import AddMessage from "./AddMessage";
import { useActiveProfile } from "../hooks/useActiveProfile";
import { useState } from "react";
import ChatFilesDetail from "./ChatFilesDetail";

export default function ChatDetail({ chatId, scopeId }: { chatId: string; scopeId?: string }) {
  const { activeProfileApiKey, isLoadingProfileDetails } = useActiveProfile();
  const [messageFilter, setMessageFilter] = useState<"all" | "user" | "v0">("all");

  const { isLoading, data, error, mutate } = useFetch<ChatDetailResponse>(
    activeProfileApiKey ? `https://api.v0.dev/v1/chats/${chatId}` : "",
    {
      headers: {
        Authorization: `Bearer ${activeProfileApiKey}`,
        "Content-Type": "application/json",
        ...(scopeId && { "x-scope": scopeId }), // Add x-scope header if scopeId is present
      },
      parseResponse: (response) => response.json(),
      execute: !!activeProfileApiKey && !isLoadingProfileDetails,
    },
  );

  const {
    isLoading: isLoadingMetadata,
    data: metadata,
    error: metadataError,
  } = useFetch<ChatMetadataResponse>(activeProfileApiKey ? `https://api.v0.dev/v1/chats/${chatId}/metadata` : "", {
    headers: {
      Authorization: `Bearer ${activeProfileApiKey}`,
    },
    parseResponse: (response) => response.json(),
    execute: !!activeProfileApiKey && !isLoadingProfileDetails,
  });

  if (error || metadataError) {
    return <Detail markdown={`# Error\n\n${error?.message || metadataError?.message}`} />;
  }

  if (isLoading || isLoadingProfileDetails || isLoadingMetadata) {
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
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      {data?.messages
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
                  shortcut={{ modifiers: ["cmd"], key: "b" }}
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
                    <AddMessage chatId={chatId} revalidateChats={mutate} chatTitle={data?.name || "Untitled Chat"} />
                  }
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
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
