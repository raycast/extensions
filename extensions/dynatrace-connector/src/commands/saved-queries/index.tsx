// P2-S2: Saved DQL Queries — CRUD for saved queries
import {
  List,
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Icon,
  useNavigation,
  showToast,
  Toast,
  Clipboard,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { listSavedQueries, deleteSavedQuery, toggleFavorite, getSavedQuery } from "../../lib/savedQueries";
import { useState } from "react";
import type { SavedQuery } from "../../lib/types/savedQuery";
import QueryResultsView from "../dql-runner/query-results";
import SavedQueryForm from "./saved-query-form";

export default function SavedQueriesCommand() {
  const {
    data: queries = [],
    isLoading,
    revalidate,
  } = useCachedPromise(listSavedQueries, [], { keepPreviousData: true });

  const [selectedQuery, setSelectedQuery] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { push } = useNavigation();

  const favorites = queries.filter((q) => q.isFavorite);
  const others = queries.filter((q) => !q.isFavorite);

  const handleDelete = async (id: string) => {
    const query = queries.find((q) => q.id === id);
    if (!query) return;

    const ok = await confirmAlert({
      title: "Delete Query",
      message: `Are you sure you want to delete "${query.name}"?`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });

    if (ok) {
      try {
        await deleteSavedQuery(id);
        await showToast({
          style: Toast.Style.Success,
          title: "Deleted",
          message: `"${query.name}" has been deleted`,
        });
        revalidate();
      } catch {
        await showToast({
          style: Toast.Style.Failure,
          title: "Delete failed",
        });
      }
    }
  };

  const handleToggleFavorite = async (id: string) => {
    try {
      await toggleFavorite(id);
      revalidate();
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Update failed",
      });
    }
  };

  const handleRunQuery = async (id: string) => {
    const query = await getSavedQuery(id);
    if (query) {
      setSelectedQuery(query.dql);
      setShowResults(true);
    }
  };

  if (showResults && selectedQuery) {
    return (
      <QueryResultsView
        dql={selectedQuery}
        onClose={() => {
          setShowResults(false);
          setSelectedQuery(null);
        }}
      />
    );
  }

  if (editingId) {
    return (
      <SavedQueryForm
        queryId={editingId}
        onSave={() => {
          setEditingId(null);
          revalidate();
        }}
        onCancel={() => setEditingId(null)}
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action
            title="Create New Query"
            icon={Icon.Plus}
            onAction={() => push(<SavedQueryForm onSave={() => revalidate()} />)}
          />
        </ActionPanel>
      }
    >
      {favorites.length > 0 && (
        <List.Section title="⭐ Favorites">
          {favorites.map((query) => (
            <QueryListItem
              key={query.id}
              query={query}
              onRun={() => handleRunQuery(query.id)}
              onToggleFavorite={() => handleToggleFavorite(query.id)}
              onEdit={() => setEditingId(query.id)}
              onDelete={() => handleDelete(query.id)}
            />
          ))}
        </List.Section>
      )}

      {others.length > 0 && (
        <List.Section title="All Queries">
          {others.map((query) => (
            <QueryListItem
              key={query.id}
              query={query}
              onRun={() => handleRunQuery(query.id)}
              onToggleFavorite={() => handleToggleFavorite(query.id)}
              onEdit={() => setEditingId(query.id)}
              onDelete={() => handleDelete(query.id)}
            />
          ))}
        </List.Section>
      )}

      {queries.length === 0 && !isLoading && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Saved Queries"
          description="Create your first saved query from DQL Runner"
        />
      )}
    </List>
  );
}

interface QueryListItemProps {
  query: SavedQuery;
  onRun: () => void;
  onToggleFavorite: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function QueryListItem({ query, onRun, onToggleFavorite, onEdit, onDelete }: QueryListItemProps) {
  const dqlPreview = query.dql.substring(0, 60).replace(/\n/g, " ");

  return (
    <List.Item
      title={query.name}
      subtitle={dqlPreview + (query.dql.length > 60 ? "…" : "")}
      accessories={[
        {
          icon: query.isFavorite ? Icon.Star : Icon.StarCircle,
          tooltip: query.isFavorite ? "Remove from favorites" : "Add to favorites",
        },
      ]}
      actions={
        <ActionPanel>
          <Action title="Run Query" icon={Icon.Play} onAction={onRun} />
          <Action.Push title="Edit" icon={Icon.Pencil} target={<EditQueryView queryId={query.id} onSave={onEdit} />} />
          <Action
            title="Toggle Favorite"
            icon={query.isFavorite ? Icon.Star : Icon.StarCircle}
            onAction={onToggleFavorite}
          />
          <Action
            title="Copy DQL"
            icon={Icon.Clipboard}
            onAction={async () => {
              await Clipboard.copy(query.dql);
              await showToast({
                style: Toast.Style.Success,
                title: "Copied",
                message: "DQL query copied to clipboard",
              });
            }}
          />
          <Action title="Delete" icon={Icon.Trash} style={Action.Style.Destructive} onAction={onDelete} />
        </ActionPanel>
      }
    />
  );
}

function EditQueryView({ queryId, onSave }: { queryId: string; onSave: () => void }) {
  const { pop } = useNavigation();
  return (
    <SavedQueryForm
      queryId={queryId}
      onSave={() => {
        onSave();
        pop();
      }}
      onCancel={() => pop()}
    />
  );
}
