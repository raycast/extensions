import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { Episode } from "../types/betaseries";

interface EpisodeListItemProps {
  episode: Episode;
  onMarkAsWatched?: (episodeId: number) => void;
  onLogout?: () => void;
}

export function EpisodeListItem({
  episode,
  onMarkAsWatched,
  onLogout,
}: EpisodeListItemProps) {
  const episodeCode = `S${String(episode.season).padStart(2, "0")}E${String(episode.episode).padStart(2, "0")}`;
  const title = `${episodeCode} - ${episode.title}`;
  const copyTitle = `${episode.show.title} ${episodeCode}`;
  const formattedDate = episode.date
    ? new Date(episode.date).toLocaleDateString()
    : "";

  return (
    <List.Item
      title={title}
      subtitle={formattedDate}
      icon={episode.user.seen ? Icon.CheckCircle : Icon.Circle}
      accessories={[{ text: episode.user.seen ? "Watched" : "Unwatched" }]}
      actions={
        <ActionPanel>
          {!episode.user.seen && onMarkAsWatched && (
            <Action
              title="Mark as Watched"
              icon={Icon.CheckCircle}
              onAction={() => onMarkAsWatched(episode.id)}
            />
          )}
          <Action.OpenInBrowser
            url={episode.resource_url}
            shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
          />
          {onLogout && (
            <Action
              title="Logout"
              icon={Icon.XMarkCircle}
              onAction={onLogout}
            />
          )}
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy Show and Episode Number"
              content={copyTitle}
              shortcut={{ modifiers: ["opt"], key: "c" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
