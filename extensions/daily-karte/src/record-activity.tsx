import { Action, ActionPanel, Icon, Keyboard, Grid } from "@raycast/api";
import { useState } from "react";
import { formatDuration, type Card } from "daily-karte";
import { getSession } from "./auth";
import { FirestoreClient } from "./lib/firestore";
import { activityIcon, ErrorView, useLoad } from "./components";
import { RecordForm } from "./entry-form";
import { EditCard, NewCard } from "./card-form";

async function loadCards() {
  const session = await getSession();
  return { session, cards: await new FirestoreClient(session).cards() };
}

export default function RecordActivity() {
  const state = useLoad(loadCards);
  const [selected, setSelected] = useState<string>();
  const [search, setSearch] = useState("");
  if (state.error) return <ErrorView error={state.error} refresh={state.refresh} />;
  const value = state.value;
  const onSaved = (card: Card) => {
    setSearch("");
    setSelected(card.id);
    state.refresh();
  };
  const props = value
    ? {
        uid: value.session.uid,
        projectId: value.session.config.projectId,
        onSaved,
      }
    : undefined;
  const create = props && (
    <Action.Push
      title="New Activity Card"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<NewCard {...props} />}
    />
  );
  return (
    <Grid
      isLoading={state.loading}
      columns={6}
      aspectRatio="1"
      inset={Grid.Inset.Small}
      filtering
      searchBarPlaceholder="Choose or manage an activity…"
      searchText={search}
      onSearchTextChange={setSearch}
      selectedItemId={selected}
      onSelectionChange={(id) => setSelected(id ?? undefined)}
    >
      <Grid.EmptyView
        title={value?.cards.length ? "No Matching Activity Cards" : "Create Your First Activity Card"}
        description="You can add an activity with its own icon and default duration."
        actions={
          <ActionPanel>
            {create}
            <Action title="Refresh" onAction={state.refresh} />
          </ActionPanel>
        }
      />
      {value && (
        <Grid.Section
          columns={6}
          aspectRatio="1"
          inset={Grid.Inset.Small}
          title={`${value.cards.length} activity cards`}
        >
          {value.cards.map((card) => (
            <Grid.Item
              key={card.id}
              id={card.id}
              title={card.name}
              content={{
                value: card.icon.startsWith("emoji:") ? card.icon.slice(6) : activityIcon(card),
                tooltip: card.name,
              }}
              subtitle={formatDuration(card.duration)}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Record Activity"
                    icon={Icon.PlusCircle}
                    target={
                      <RecordForm card={card} uid={value.session.uid} projectId={value.session.config.projectId} />
                    }
                  />
                  <Action.Push
                    title="Edit Activity Card"
                    icon={Icon.Pencil}
                    shortcut={Keyboard.Shortcut.Common.Edit}
                    target={<EditCard id={card.id} {...props!} />}
                  />
                  {create}
                  <Action title="Refresh" shortcut={Keyboard.Shortcut.Common.Refresh} onAction={state.refresh} />
                  <Action.OpenInBrowser title="Open Daily Karte" url={value.session.config.website} />
                </ActionPanel>
              }
            />
          ))}
        </Grid.Section>
      )}
    </Grid>
  );
}
