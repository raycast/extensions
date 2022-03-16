import { NotebooksResponseData } from "@datadog/datadog-api-client/dist/packages/datadog-api-client-v1/models/NotebooksResponseData";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useNotebooks, clearLocalState, Caches } from "./fetchers";
import { linkDomain, moveBetween } from "./utils";

interface ActionableNotebook {
  data: NotebooksResponseData;
  isFavorite?: boolean;
  fave: (id: number) => void;
  unfave: (id: number) => void;
}

const Notebook = ({ data, fave, unfave, isFavorite = false }: ActionableNotebook) => {
  // prettier-ignore
  const faveAction = isFavorite
    ? <Action icon={Icon.XmarkCircle} title="Remove from favourites" onAction={() => { unfave(data.id) }} />
    : <Action icon={Icon.Star} title="Add to favourites" onAction={() => { fave(data.id) }} />

  const icon = isFavorite ? Icon.Star : null;

  return (
    <List.Item
      key={data.id}
      icon={icon}
      title={data.attributes.name}
      subtitle={data.attributes.metadata?.type}
      accessoryTitle={data.attributes.author?.email}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={`https://${linkDomain()}/notebook/${data.id}`} />
          {faveAction}
          <Action icon={Icon.Trash} title="Clear notebooks cache" onAction={() => clearLocalState(Caches.Notebooks)} />
        </ActionPanel>
      }
    />
  );
};

export default function CommandListNotebooks() {
  const { state, updateAndSaveState, notebooksAreLoading } = useNotebooks();

  const fave = (id: number) => {
    moveBetween(state.notebooks, state.favorites, id);
    updateAndSaveState(state);
  };

  const unfave = (id: number) => {
    moveBetween(state.favorites, state.notebooks, id);
    updateAndSaveState(state);
  };

  return (
    <List isLoading={notebooksAreLoading}>
      {state.favorites.length > 0 && (
        <List.Section title="Favourites" key="faves">
          {state.favorites.map(notebook => (
            <Notebook key={notebook.id} data={notebook} fave={fave} unfave={unfave} isFavorite={true} />
          ))}
        </List.Section>
      )}
      {/* this his not very nice, but there is no divider between sections currently */}
      {state.favorites.length == 0 ? (
        state.notebooks.map(notebook => <Notebook key={notebook.id} data={notebook} fave={fave} unfave={unfave} />)
      ) : (
        <List.Section title="All notebooks" key="all">
          {state.notebooks.map(notebook => (
            <Notebook key={notebook.id} data={notebook} fave={fave} unfave={unfave} />
          ))}
        </List.Section>
      )}
    </List>
  );
}
