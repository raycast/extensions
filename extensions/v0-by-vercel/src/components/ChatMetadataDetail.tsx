import { List, Color } from "@raycast/api";
import type { ChatSummary } from "../types";
import { useProjects } from "../hooks/useProjects";

export default function ChatMetadataDetail({ chat }: { chat: ChatSummary }) {
  const { projects } = useProjects();

  const formatPrivacy = (privacy: string) => {
    return privacy
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <List navigationTitle="Chat Metadata">
      <List.Item title="Title" subtitle={chat.name || "Untitled Chat"} />
      <List.Item title="Last Updated" subtitle={chat.updatedAt ? new Date(chat.updatedAt).toLocaleString() : "N/A"} />
      <List.Item
        title="Privacy"
        accessories={[
          {
            tag: {
              value: formatPrivacy(chat.privacy),
              color:
                chat.privacy === "public"
                  ? Color.Blue
                  : chat.privacy === "private"
                    ? Color.Orange
                    : chat.privacy === "team"
                      ? Color.Green
                      : chat.privacy === "unlisted"
                        ? Color.Yellow
                        : Color.SecondaryText,
            },
          },
        ]}
      />
      {chat.projectId && (
        <List.Item
          title="Project"
          subtitle={projects.find((project) => project.id === chat.projectId)?.name || "Unknown Project"}
        />
      )}
      {chat.latestVersion?.status && <List.Item title="Status" subtitle={chat.latestVersion.status} />}
    </List>
  );
}
