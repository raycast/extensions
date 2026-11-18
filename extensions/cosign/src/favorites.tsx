import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { OrganizationView, PersonView } from "./components/entities";
import { ErrorEmptyView } from "./components/error-view";
import { FavoriteAction, useFavorites } from "./components/favorite";
import { EntityRow } from "./components/rows";
import type { Favorite } from "./lib/favorites";

export default function Command() {
  const { data, isLoading, error, revalidate } = useFavorites();

  const row = (f: Favorite) => (
    <EntityRow
      key={`${f.kind}:${f.id}`}
      kind={f.kind}
      id={`${f.kind}:${f.id}`}
      name={f.name}
      imageUrl={f.imageUrl}
      subtitle={f.subtitle}
      starred
      actions={
        <ActionPanel>
          <Action.Push
            title="Show Full Profile"
            icon={f.kind === "people" ? Icon.Person : Icon.Building}
            target={f.kind === "people" ? <PersonView nomineeId={f.id} /> : <OrganizationView organizationId={f.id} />}
          />
          <FavoriteAction kind={f.kind} id={f.id} name={f.name} shortcut={false} />
        </ActionPanel>
      }
    />
  );

  const empty = !isLoading && !data?.people.length && !data?.organizations.length;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter favorites">
      <List.Section title="People">{data?.people.map(row)}</List.Section>
      <List.Section title="Companies">{data?.organizations.map(row)}</List.Section>
      {empty ? (
        error && !data ? (
          <ErrorEmptyView title="Couldn't load favorites" error={error} retry={revalidate} />
        ) : (
          <List.EmptyView title="No favorites yet" description="Press ⌘⇧F on a person or company to add one." />
        )
      ) : null}
    </List>
  );
}
