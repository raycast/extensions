import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { apiBase, consoleUrl, getMe, listDatabases } from "./api";

export default function ListDatabases() {
  const { data, isLoading, error } = useCachedPromise(async () => {
    const [me, databases] = await Promise.all([getMe(), listDatabases()]);
    return { me, databases };
  });

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Warning}
          title="Failed to load databases"
          description={error.message}
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search databases…">
      {data?.databases.map((db) => (
        <List.Item
          key={db.id}
          icon={db.forkedFromId ? Icon.ArrowNe : Icon.HardDrive}
          title={db.name}
          subtitle={db.slug}
          accessories={[
            ...(db.expiresAt
              ? [{ icon: Icon.Clock, tooltip: `Expires ${db.expiresAt}` }]
              : []),
            { tag: db.status },
          ]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open in Console"
                url={consoleUrl(data.me.namespaceSlug, db.slug)}
              />
              <Action.CopyToClipboard
                title="Copy Database Path"
                content={`${data.me.namespaceSlug}/${db.slug}`}
              />
              <Action.CopyToClipboard
                title="Copy Query URL"
                content={`${apiBase()}/v1/db/${data.me.namespaceSlug}/${db.slug}/query`}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      ))}
      <List.EmptyView
        icon={Icon.HardDrive}
        title="No databases"
        description="Create one with the Create Scratch Database command."
      />
    </List>
  );
}
