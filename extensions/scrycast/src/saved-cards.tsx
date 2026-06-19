import { Grid, ActionPanel, Action, showToast, Toast, Icon, Clipboard } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { useMemo } from "react";
import { Card, SAVED_CARDS_KEY, getCardImageUri } from "./shared";
import { COLLECTION_IDS_KEY, COLLECTION_NAMES_KEY } from "./collection";
import { CardDetailView, CardActions } from "./card-views";
import Command from "./search-view";

export default function SavedCards() {
  const { value: savedCards, setValue: setSavedCards, isLoading } = useLocalStorage<Card[]>(SAVED_CARDS_KEY, []);

  const { value: collectionIds } = useLocalStorage<string[]>(COLLECTION_IDS_KEY, []);
  const { value: collectionNames } = useLocalStorage<string[]>(COLLECTION_NAMES_KEY, []);
  const collectionIdSet = useMemo(() => new Set(collectionIds ?? []), [collectionIds]);
  const collectionNameSet = useMemo(() => new Set(collectionNames ?? []), [collectionNames]);

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
            const exactMatch = collectionIdSet.has(card.id);
            const nameMatch = !exactMatch && collectionNameSet.has(card.name);
            return (
              <Grid.Item
                key={card.id}
                content={{ source: imageUri }}
                title={`${exactMatch ? "✅ " : nameMatch ? "☑️ " : ""}${card.name}`}
                subtitle={card.set_name}
                actions={
                  <CardActions
                    card={card}
                    imageUri={imageUri}
                    searchTagTarget={(query) => <Command initialSearch={query} />}
                    detailsTarget={
                      <CardDetailView card={card} searchTagTarget={(query) => <Command initialSearch={query} />} />
                    }
                    isSaved={true}
                    onToggleSave={removeCard}
                  >
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
                  </CardActions>
                }
              />
            );
          })}
        </Grid.Section>
      )}
    </Grid>
  );
}
