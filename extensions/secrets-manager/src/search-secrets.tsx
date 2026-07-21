import { List } from "@raycast/api";
import { useState } from "react";
import { useSecretsData } from "./lib/use-secrets-data";
import { SecretItem } from "./components/secret-item";
import { TagDropdown } from "./components/tag-dropdown";
import type { Secret } from "./lib/types";

// Smart match: case-insensitive, every whitespace-separated term must appear
// somewhere in the secret's name, tags, or folder path (substring, not prefix).
function matches(secret: Secret, query: string): boolean {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = [secret.name, secret.folder.join("/"), ...secret.tags].join(" ").toLowerCase();
  return terms.every((t) => haystack.includes(t));
}

export default function SearchSecrets() {
  const { data, loading, reload } = useSecretsData();
  const [tag, setTag] = useState("all");
  const [query, setQuery] = useState("");

  const allTags = [...new Set(data.secrets.flatMap((s) => s.tags))].sort();

  const shown = data.secrets.filter((s) => (tag === "all" || s.tags.includes(tag)) && matches(s, query));

  return (
    <List
      isLoading={loading}
      filtering={false}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search secrets by name, tag or folder"
      searchBarAccessory={<TagDropdown tag={tag} setTag={setTag} allTags={allTags} />}
    >
      {shown.map((s) => (
        <SecretItem key={s.id} secret={s} reload={reload} />
      ))}
    </List>
  );
}
