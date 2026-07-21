import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useState } from "react";
import type { Secret } from "./lib/types";
import { useSecretsData } from "./lib/use-secrets-data";
import { SecretItem } from "./components/secret-item";
import { TagDropdown } from "./components/tag-dropdown";

export function childFolders(tree: string[][], path: string[]): string[][] {
  return tree.filter((f) => f.length === path.length + 1 && path.every((p, i) => f[i] === p));
}
export function secretsAt(secrets: Secret[], path: string[]): Secret[] {
  return secrets.filter((s) => s.folder.length === path.length && path.every((p, i) => s.folder[i] === p));
}

function FolderView({ path }: { path: string[] }) {
  const { data, loading, reload } = useSecretsData();
  const [tag, setTag] = useState("all");

  const allTags = [...new Set(data.secrets.flatMap((s) => s.tags))].sort();

  // Tag filter is global and flat; folder navigation applies only when no tag is selected.
  if (tag !== "all") {
    const filtered = data.secrets.filter((s) => s.tags.includes(tag));
    return (
      <List isLoading={loading} searchBarAccessory={<TagDropdown tag={tag} setTag={setTag} allTags={allTags} />}>
        {filtered.map((s) => (
          <SecretItem key={s.id} secret={s} reload={reload} />
        ))}
      </List>
    );
  }

  const folders = childFolders(data.tree, path);
  const secrets = secretsAt(data.secrets, path);

  return (
    <List
      isLoading={loading}
      navigationTitle={path.length ? path.join("/") : "Secrets"}
      searchBarAccessory={path.length === 0 ? <TagDropdown tag={tag} setTag={setTag} allTags={allTags} /> : undefined}
    >
      <List.Section title="Folders">
        {folders.map((f) => (
          <List.Item
            key={f.join("/")}
            title={f[f.length - 1]}
            icon={Icon.Folder}
            actions={
              <ActionPanel>
                <Action.Push title="Open Folder" icon={Icon.Folder} target={<FolderView path={f} />} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Secrets">
        {secrets.map((s) => (
          <SecretItem key={s.id} secret={s} reload={reload} />
        ))}
      </List.Section>
    </List>
  );
}

export default function ManageSecrets() {
  return <FolderView path={[]} />;
}
