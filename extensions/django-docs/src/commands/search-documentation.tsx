import { ActionPanel, List, Action, Icon, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState, useMemo } from "react";
import Fuse from "fuse.js";
import { fetchDocEntries } from "../services/django-docs";
import { writeCache, readCache } from "../services/cache";
import { DocDetail } from "../components/DocDetail";
import { DJANGO_VERSIONS, DjangoVersion } from "../constants";
import { SerializableEntry, serializeEntries, deserializeEntries } from "../services/serialization";

async function loadDocEntries(version: DjangoVersion): Promise<SerializableEntry[]> {
  // Try loading from cache first
  const cachedEntries = readCache(version);
  if (cachedEntries && cachedEntries.length > 0) {
    return serializeEntries(cachedEntries);
  }

  // No cache - fetch fresh
  const toast = await showToast({ style: Toast.Style.Animated, title: "Fetching documentation..." });
  const docEntries = await fetchDocEntries(version);
  toast.hide();

  // Write to cache
  writeCache(version, docEntries);
  await showToast({ style: Toast.Style.Success, title: `Loaded ${docEntries.length} documentation pages` });

  return serializeEntries(docEntries);
}

function VersionDropdown({
  version,
  onVersionChange,
}: {
  version: DjangoVersion;
  onVersionChange: (v: DjangoVersion) => void;
}) {
  return (
    <List.Dropdown
      tooltip="Select a version"
      value={version}
      onChange={(newValue: string) => onVersionChange(newValue as DjangoVersion)}
    >
      {DJANGO_VERSIONS.map((ver: string) => (
        <List.Dropdown.Item key={ver} title={ver === "dev" ? "Development (unstable)" : `v${ver}`} value={ver} />
      ))}
    </List.Dropdown>
  );
}

export default function SearchDocumentationCommand() {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [version, setVersion] = useState<DjangoVersion>("6.0");

  const { data: serializedEntries = [], isLoading } = useCachedPromise(loadDocEntries, [version], {
    keepPreviousData: true,
    onError: (error) => {
      console.error("Error loading docs:", error);
      showToast({ style: Toast.Style.Failure, title: "Failed to load documentation" });
    },
  });

  // Reconstruct circular references from serialized data
  const entries = useMemo(() => deserializeEntries(serializedEntries), [serializedEntries]);

  // Memoize Fuse instance separately to avoid recreation on every search
  const fuse = useMemo(() => {
    return new Fuse(entries, {
      keys: [
        { name: "title", weight: 2 }, // Page title most important
        { name: "headings", weight: 1 }, // Section headings for better relevance
      ],
      threshold: 0.4, // 0 = perfect match, 1 = match anything
      ignoreLocation: true, // Search entire string, not just beginning
      minMatchCharLength: 2, // Require at least 2 characters to match
    });
  }, [entries]);

  // Filter entries using Fuse.js fuzzy search
  const filteredEntries = useMemo(() => {
    if (!searchTerm.trim()) {
      return entries;
    }

    const results = fuse.search(searchTerm);
    return results.map((result) => result.item);
  }, [searchTerm, fuse, entries]);

  return (
    <List
      filtering={false}
      onSearchTextChange={setSearchTerm}
      isLoading={isLoading}
      searchBarPlaceholder="Search Django Documentation..."
      searchBarAccessory={<VersionDropdown version={version} onVersionChange={setVersion} />}
    >
      {filteredEntries.map((entry) => (
        <List.Item
          key={entry.url}
          id={entry.url}
          icon={Icon.Document}
          title={entry.title}
          subtitle={entry.parent?.title ?? ""}
          actions={
            <ActionPanel>
              <Action.Push title="View Documentation" icon={Icon.Eye} target={<DocDetail entry={entry} />} />
              <Action.OpenInBrowser url={entry.url} title="Open in Browser" />
              <Action.CopyToClipboard content={entry.url} title="Copy URL" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
