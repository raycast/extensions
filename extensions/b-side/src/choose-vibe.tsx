import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { loadVibes, send, subtitle, Vibe } from "./bside";

function icon(vibe: Vibe) {
  if (vibe.source.likedShuffled) return Icon.Heart;
  if (vibe.source.playlist) return Icon.BulletPoints;
  if (vibe.source.radio) return Icon.Livestream;
  return Icon.SpeechBubble;
}

export default function Command() {
  const { data, isLoading } = usePromise(loadVibes);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search vibes">
      {data?.map((vibe) => (
        <List.Item
          key={vibe.id}
          icon={icon(vibe)}
          title={vibe.name}
          subtitle={subtitle(vibe)}
          actions={
            <ActionPanel>
              <Action
                title="Play Vibe"
                icon={Icon.Play}
                onAction={() => send("vibe", `Playing ${vibe.name}`, `?id=${encodeURIComponent(vibe.id)}`)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
