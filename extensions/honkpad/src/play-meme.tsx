import { Action, ActionPanel, Color, Icon, Keyboard, List, openExtensionPreferences, showHUD } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { describeOutcome, errorText, listMemes, Meme, playMeme } from "./api";

export default function Command() {
  const { data, isLoading, error, revalidate } = usePromise(listMemes, [], {
    // The empty view below explains the error; no extra toast.
    onError: () => undefined,
  });

  async function play(meme: Meme) {
    try {
      await showHUD(describeOutcome(await playMeme(meme.id), meme.name));
    } catch (e) {
      await showFailureToast(e, errorText(e));
    }
  }

  if (error) {
    const { title, message } = errorText(error);
    return (
      <List>
        <List.EmptyView
          icon={Icon.SpeakerOff}
          title={title}
          description={message}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search memes">
      <List.EmptyView icon={Icon.Music} title="No memes on this board" />
      {data?.map((meme) => (
        <List.Item
          key={meme.id}
          icon={meme.emoji || Icon.Music}
          title={meme.name}
          keywords={meme.tags}
          accessories={[
            ...meme.tags.slice(0, 3).map((tag) => ({ tag: { value: tag, color: Color.SecondaryText } })),
            ...(meme.hasVisual ? [{ icon: Icon.Video, tooltip: "Has a visual" }] : []),
          ]}
          actions={
            <ActionPanel>
              <Action title="Play" icon={Icon.Play} onAction={() => play(meme)} />
              <Action.CopyToClipboard title="Copy Meme ID" content={meme.id} />
              <Action
                title="Reload Memes"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
