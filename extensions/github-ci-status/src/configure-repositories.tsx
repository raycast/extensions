import { Action, ActionPanel, Color, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { Repository } from "./lib/model";
import { useGitHubClient } from "./lib/use-recent-ci";

export function ConfigureRepositories({
  token,
  selection,
  onChange,
}: {
  token: string;
  selection: Repository[] | null;
  onChange: (repositories: Repository[] | null) => Promise<void>;
}) {
  const { client } = useGitHubClient(token);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selected, setSelected] = useState(selection);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [revision, setRevision] = useState(0);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(undefined);
    client.repositories(controller.signal, revision > 0).then(
      (repos) => {
        if (!controller.signal.aborted) {
          setRepositories(repos);
          setLoading(false);
        }
      },
      (cause) => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "Unable to load repositories.");
          setLoading(false);
        }
      },
    );
    return () => controller.abort();
  }, [client, revision]);

  async function save(next: Repository[] | null) {
    if (saving) return;
    setSaving(true);
    try {
      await onChange(next);
      setSelected(next);
    } catch {
      await showToast({ style: Toast.Style.Failure, title: "Unable to save repository selection" });
    } finally {
      setSaving(false);
    }
  }

  const allRepositories = [
    ...new Map([...repositories, ...(selected ?? [])].map((repo) => [repo.id, repo])).values(),
  ].sort((a, b) => a.full_name.localeCompare(b.full_name));
  const query = searchText.trim().toLowerCase();
  const visible = allRepositories.filter((repo) => repo.full_name.toLowerCase().includes(query));
  const selectedIds = selected === null ? null : new Set(selected.map((repo) => repo.id));
  const commonActions = (
    <>
      {query && visible.length > 0 && !loading && !error && (
        <>
          <Action
            title="Track Filtered Repositories"
            icon={Icon.Checkmark}
            shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
            onAction={() =>
              save(
                selected === null
                  ? null
                  : [...new Map([...selected, ...visible].map((repo) => [repo.id, repo])).values()],
              )
            }
          />
          <Action
            title="Untrack Filtered Repositories"
            icon={Icon.Circle}
            shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
            onAction={() => {
              const filteredIds = new Set(visible.map((repo) => repo.id));
              return save((selected ?? allRepositories).filter((repo) => !filteredIds.has(repo.id)));
            }}
          />
        </>
      )}
      <Action title="Track All Repositories" icon={Icon.Checkmark} onAction={() => save(null)} />
      <Action title="Untrack All Repositories" icon={Icon.Circle} onAction={() => save([])} />
      <Action
        title="Refresh Repositories"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={() => setRevision((value) => value + 1)}
      />
    </>
  );

  return (
    <List
      isLoading={loading || saving}
      navigationTitle="Configure Repositories"
      searchBarPlaceholder="Search repositories…"
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
    >
      {error && (
        <List.Item
          title="Unable to refresh repositories"
          subtitle={error}
          icon={Icon.ExclamationMark}
          actions={<ActionPanel>{commonActions}</ActionPanel>}
        />
      )}
      <List.Section
        title={selected === null ? "Tracking all repositories" : `${selected.length} repositories tracked`}
        subtitle="Enter to toggle · Changes saved automatically · Esc to return"
      >
        {visible.map((repo) => {
          const tracked = selectedIds === null || selectedIds.has(repo.id);
          return (
            <List.Item
              key={repo.id}
              id={String(repo.id)}
              title={repo.full_name}
              icon={Icon.Code}
              accessories={[
                tracked
                  ? { icon: { source: Icon.Checkmark, tintColor: Color.Green }, tooltip: "Tracked" }
                  : { icon: Icon.Circle, tooltip: "Not tracked" },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title={tracked ? "Untrack Repository" : "Track Repository"}
                    icon={tracked ? Icon.Circle : Icon.Checkmark}
                    onAction={() =>
                      save(
                        tracked
                          ? (selected ?? repositories).filter((item) => item.id !== repo.id)
                          : [...(selected ?? []), repo],
                      )
                    }
                  />
                  {commonActions}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      <List.EmptyView
        title={loading ? "Loading repositories…" : "No repositories found"}
        description="Try another search or refresh the repository list."
        actions={<ActionPanel>{commonActions}</ActionPanel>}
      />
    </List>
  );
}
