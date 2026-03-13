import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Detail,
  Icon,
  LaunchProps,
  List,
  Toast,
  confirmAlert,
  popToRoot,
  showToast,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { withGitHubOAuth } from "./lib/auth";
import { removeGistFromCachePayload } from "./lib/cache-payload";
import { deleteGistFromCache } from "./lib/cache-utils";
import {
  createSearchIndex,
  searchDocuments,
  sortRecentGists,
} from "./lib/search";
import { syncAllGists } from "./lib/sync";
import { loadCache } from "./lib/storage";
import { CachePayload, GistRecord } from "./lib/types";
import { formatDate, formatVisibility, pluralize } from "./lib/format";

function formatGistTitle(gist: GistRecord): string {
  const [firstFile] = gist.files;

  if (!firstFile) {
    return "(Untitled gist)";
  }

  const extraFileCount = gist.files.length - 1;
  if (extraFileCount <= 0) {
    return firstFile.filename;
  }

  return `${firstFile.filename} (+${extraFileCount} more)`;
}

function formatGistSubtitle(gist: GistRecord): string | undefined {
  const description = gist.description.trim();
  return description || undefined;
}

function buildPreviewMarkdown(gist: GistRecord): string {
  const sections = gist.files.map((file) => {
    const content = file.content?.trim();

    if (!content) {
      return "_No preview available_";
    }

    return ["```", content, "```"].join("\n\n");
  });

  return sections.join("\n\n---\n\n");
}

function buildPasteContent(gist: GistRecord): string {
  return gist.files
    .map((file) => file.content?.trim())
    .filter((content): content is string => Boolean(content))
    .join("\n\n");
}

async function pasteGistContent(gist: GistRecord) {
  const content = buildPasteContent(gist);

  if (!content) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No gist content available",
    });
    return;
  }

  await Clipboard.paste(content);
  await showToast({
    style: Toast.Style.Success,
    title: "Pasted gist content",
  });
}

type GistPreviewProps = {
  gist: GistRecord;
  onDelete: (gist: GistRecord) => Promise<void>;
};

function GistPreview({ gist, onDelete }: GistPreviewProps) {
  return (
    <Detail
      navigationTitle=""
      markdown={buildPreviewMarkdown(gist)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Filename"
            text={formatGistTitle(gist)}
          />
          <Detail.Metadata.Label
            title="Description"
            text={formatGistSubtitle(gist) ?? "No description"}
          />
          <Detail.Metadata.Label
            title="Visibility"
            text={formatVisibility(gist.public)}
          />
          <Detail.Metadata.Label
            title="Files"
            text={pluralize(gist.files.length, "file")}
          />
          <Detail.Metadata.Label
            title="Updated"
            text={formatDate(gist.updatedAt)}
          />
          <Detail.Metadata.Link
            title="GitHub"
            text="Open Gist"
            target={gist.htmlUrl}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            title="Paste Gist Content"
            icon={Icon.Clipboard}
            onAction={() => pasteGistContent(gist)}
          />
          <Action.OpenInBrowser
            title="Show in GitHub"
            url={gist.htmlUrl}
            shortcut={{ modifiers: ["ctrl"], key: "enter" }}
          />
          <Action
            title="Copy Gist URL"
            onAction={() => Clipboard.copy(gist.htmlUrl)}
          />
          <Action
            title="Delete Gist"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={() => onDelete(gist)}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
          />
        </ActionPanel>
      }
    />
  );
}

function SearchGists(_props: LaunchProps) {
  const [query, setQuery] = useState("");
  const [cache, setCache] = useState<CachePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingGistId, setDeletingGistId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      try {
        const loaded = await loadCache();
        if (!isMounted) {
          return;
        }

        setCache(loaded);
        setIsLoading(!loaded);
        setIsRefreshing(true);

        try {
          const { payload } = await syncAllGists();
          if (!isMounted) {
            return;
          }

          setCache(payload);
          setError(null);
        } catch (err) {
          if (!isMounted) {
            return;
          }

          if (!loaded) {
            setError(
              err instanceof Error ? err.message : "Failed to refresh gists.",
            );
          }
        } finally {
          if (isMounted) {
            setIsRefreshing(false);
            setIsLoading(false);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : "Failed to load gists.",
          );
          setIsLoading(false);
        }
      }
    }

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, []);

  const indexBundle = useMemo(() => {
    if (!cache) {
      return null;
    }
    return createSearchIndex(cache.documents, cache.gists);
  }, [cache]);

  const gists: GistRecord[] = useMemo(() => {
    if (!cache) {
      return [];
    }

    if (!query.trim()) {
      return sortRecentGists(cache.gists);
    }

    if (!indexBundle) {
      return [];
    }

    return searchDocuments(indexBundle, query)
      .map((result) => indexBundle.byGistId.get(String(result.gistId)))
      .filter((gist): gist is GistRecord => Boolean(gist));
  }, [cache, indexBundle, query]);

  async function copyGistUrl(url: string) {
    await Clipboard.copy(url);
    await showToast({ style: Toast.Style.Success, title: "Copied gist URL" });
  }

  async function handleDeleteGist(gist: GistRecord) {
    const confirmed = await confirmAlert({
      title: "Delete gist?",
      message: `This permanently deletes ${formatGistTitle(gist)} from GitHub.`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    setDeletingGistId(gist.id);

    try {
      await deleteGistFromCache(gist.id);
      setCache((current) =>
        current ? removeGistFromCachePayload(current, gist.id) : current,
      );
      await showToast({
        style: Toast.Style.Success,
        title: "Gist deleted",
      });
      await popToRoot();
    } catch (deleteError) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete gist",
        message:
          deleteError instanceof Error ? deleteError.message : "Unknown error",
      });
    } finally {
      setDeletingGistId(null);
    }
  }

  if (error) {
    return (
      <List isLoading={false} searchBarPlaceholder="Search gists">
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Setup required"
          description={error}
        />
      </List>
    );
  }

  if (!cache) {
    return (
      <List
        isLoading={isLoading || isRefreshing}
        searchBarPlaceholder="Search gists"
        onSearchTextChange={setQuery}
      >
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No gist index yet"
          description="Run the Refresh Gists command to build your local gist index."
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading || isRefreshing}
      searchBarPlaceholder="Search gists"
      onSearchTextChange={setQuery}
      throttle
    >
      {gists.map((gist) => (
        <List.Item
          key={gist.id}
          title={formatGistTitle(gist)}
          subtitle={formatGistSubtitle(gist)}
          accessories={[
            { tag: formatVisibility(gist.public) },
            { text: formatDate(gist.updatedAt) },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Preview Gist"
                icon={Icon.Eye}
                target={<GistPreview gist={gist} onDelete={handleDeleteGist} />}
              />
              <Action.OpenInBrowser
                title="Show in GitHub"
                url={gist.htmlUrl}
                shortcut={{ modifiers: ["ctrl"], key: "enter" }}
              />
              <Action
                title="Copy Gist URL"
                onAction={() => copyGistUrl(gist.htmlUrl)}
              />
              <Action
                title="Delete Gist"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => handleDeleteGist(gist)}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default withGitHubOAuth(SearchGists);
