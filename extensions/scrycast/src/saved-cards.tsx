import { Grid, ActionPanel, Action, showToast, Toast, Color, Icon, Clipboard } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import {
  Card,
  SAVED_CARDS_KEY,
  FEEDBACK_URL,
  getCardImageUri,
  getEdhrecUrl,
  getTaggerUrl,
  copyCardImage,
} from "./shared";
import { CardDetailView, CardTagsView, PrintsView } from "./card-views";
import Command from "./search-view";

export default function SavedCards() {
  const { value: savedCards, setValue: setSavedCards, isLoading } = useLocalStorage<Card[]>(SAVED_CARDS_KEY, []);

  function removeCard(card: Card) {
    setSavedCards((savedCards ?? []).filter((c) => c.id !== card.id));
    showToast({ style: Toast.Style.Success, title: "Removed from Bookmarks" });
  }

  return (
    <Grid
      columns={3}
      aspectRatio="2/3"
      fit={Grid.Fit.Fill}
      inset={Grid.Inset.Small}
      isLoading={isLoading}
      searchBarPlaceholder="Filter bookmarked cards"
      navigationTitle="Bookmarked Cards"
    >
      {!isLoading && (savedCards ?? []).length === 0 ? (
        <Grid.EmptyView icon="🧙" title="No Bookmarked Cards" description="Save cards from Search Cards with ⌘⇧B" />
      ) : (
        <Grid.Section
          title={`${(savedCards ?? []).length} bookmarked card${(savedCards ?? []).length !== 1 ? "s" : ""}`}
        >
          {(savedCards ?? []).map((card) => {
            const imageUri = getCardImageUri(card);
            return (
              <Grid.Item
                key={card.id}
                content={{ source: imageUri }}
                title={card.name}
                subtitle={card.set_name}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title={card.name}>
                      <Action.Push
                        title="Show Card Details"
                        target={
                          <CardDetailView card={card} searchTagTarget={(query) => <Command initialSearch={query} />} />
                        }
                        icon={Icon.Eye}
                      />
                      <Action.OpenInBrowser
                        title="Open in Scryfall"
                        url={card.scryfall_uri}
                        icon={{ source: Icon.Globe, tintColor: Color.Blue }}
                        shortcut={{ modifiers: ["cmd"], key: "return" }}
                      />
                      <Action.OpenInBrowser
                        title="Open in Edhrec" // eslint-disable-line @raycast/prefer-title-case
                        url={getEdhrecUrl(card.name)}
                        icon={{ source: Icon.Person, tintColor: Color.Green }}
                        shortcut={{ modifiers: ["cmd", "ctrl"], key: "return" }}
                      />
                      <Action.CopyToClipboard
                        title="Copy Card Name"
                        content={card.name}
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                        icon={Icon.Clipboard}
                      />
                      <Action
                        title="Copy Card Image"
                        icon={Icon.Image}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                        onAction={async () => {
                          const toast = await showToast({ style: Toast.Style.Animated, title: "Copying image…" });
                          try {
                            await copyCardImage(imageUri);
                            toast.style = Toast.Style.Success;
                            toast.title = "Image copied";
                          } catch (err) {
                            toast.style = Toast.Style.Failure;
                            toast.title = "Failed to copy image";
                            toast.message = (err as Error).message;
                          }
                        }}
                      />
                      <Action
                        title="Remove from Saved"
                        icon={Icon.StarDisabled}
                        shortcut={{ modifiers: ["cmd"], key: "b" }}
                        onAction={() => removeCard(card)}
                      />
                      <Action.OpenInBrowser
                        title="Open in Scryfall Tagger"
                        url={getTaggerUrl(card)}
                        icon={{ source: Icon.Tag, tintColor: Color.Orange }}
                        shortcut={{ modifiers: ["cmd"], key: "t" }}
                      />
                      <Action.Push
                        title="Show Tags"
                        target={
                          <CardTagsView card={card} searchTagTarget={(query) => <Command initialSearch={query} />} />
                        }
                        icon={{ source: Icon.Tag, tintColor: Color.Purple }}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                      />
                      <Action.Push
                        title="View All Prints"
                        target={
                          <PrintsView card={card} searchTagTarget={(query) => <Command initialSearch={query} />} />
                        }
                        icon={Icon.List}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section title="All Bookmarked Cards">
                      <Action
                        title="Copy All Cards to Clipboard"
                        icon={Icon.CopyClipboard}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                        onAction={async () => {
                          const names = (savedCards ?? []).map((c) => c.name).join("\n");
                          await Clipboard.copy(names);
                          showToast({ style: Toast.Style.Success, title: "Copied all card names" });
                        }}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Feedback">
                      <Action.OpenInBrowser title="Submit Bug or Feature Request" url={FEEDBACK_URL} icon={Icon.Bug} />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </Grid.Section>
      )}
    </Grid>
  );
}
