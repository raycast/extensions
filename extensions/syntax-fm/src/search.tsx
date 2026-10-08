import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { launchAppleMusic } from "./api/apple-music";
import ShowNotesDetail from "./components/show-notes-detail";
import { useEpisodes } from "./hooks/use-episodes";

export default function Command() {
  const { isLoading, data } = useEpisodes();

  return (
    <List isLoading={isLoading}>
      {data &&
        data.map((item) => {
          return (
            <List.Item
              key={item.hash}
              title={`${item.number}: ${item.title}`}
              accessories={[{ date: new Date(item.date) }]}
              actions={
                <ActionPanel>
                  {item.href && <Action.OpenInBrowser url={`https://syntax.fm/${item.href}`} />}
                  <Action
                    icon={Icon.Play}
                    title="Play in Apple Music"
                    onAction={async () => {
                      await launchAppleMusic(item.url, item.title);
                    }}
                  />
                  <ActionPanel.Section>
                    {item.youtube_url && (
                      <Action.OpenInBrowser
                        icon={Icon.Video}
                        url={item.youtube_url}
                        title="Watch on YouTube"
                        shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
                      />
                    )}
                    <Action.Push
                      icon={Icon.Document}
                      title="View Show Notes"
                      target={<ShowNotesDetail title={item.title} content={item.show_notes} />}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
}
