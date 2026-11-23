import { Action, ActionPanel, Icon, List, Toast, showToast, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { accountId, getJson, getPage, sameAccount, sendJson } from "./api";
import { ErrorView } from "./error-view";
import { contentText, fileIcon, kindTitle, statusIcon, statusText } from "./format";
import { MediaFile, Playlist, Screen } from "./types";

export async function assignContent(
  screen: Pick<Screen, "id" | "name">,
  contentKind: string,
  contentId: string,
  contentName: string,
): Promise<boolean> {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Changing the content…" });
  try {
    await sendJson("POST", `/v1/screens/${encodeURIComponent(screen.id)}/assign`, { contentKind, contentId });
    toast.style = Toast.Style.Success;
    toast.title = `"${screen.name}" plays ${contentName}`;
    return true;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not change the content";
    toast.message = error instanceof Error ? error.message : String(error);
    return false;
  }
}

/** Pick a playlist or a file for one screen. */
export function ChooseContent({ screen, onDone }: { screen: Screen; onDone?: () => void }) {
  const { pop } = useNavigation();
  const [search, setSearch] = useState("");
  const playlists = useCachedPromise(
    (account: string) => {
      sameAccount(account);
      return getJson<Playlist[]>("/v1/playlists");
    },
    [accountId()],
    {
      failureToastOptions: { title: "Could not load playlists" },
    },
  );
  const files = useCachedPromise(
    (account: string, q: string) => {
      sameAccount(account);
      return getPage<MediaFile>("/v1/media", { search: q || undefined, state: "ready", limit: 50 });
    },
    [accountId(), search],
    { keepPreviousData: true, failureToastOptions: { title: "Could not load files" } },
  );
  const loadError = playlists.error ?? files.error;
  const nothing = !playlists.data?.length && !files.data?.data.length;
  const q = search.trim().toLowerCase();
  const shownPlaylists = (playlists.data ?? []).filter((p) => !q || p.name.toLowerCase().includes(q));

  const choose = async (kind: string, id: string, name: string) => {
    if (await assignContent(screen, kind, id, name)) {
      onDone?.();
      pop();
    }
  };

  return (
    <List
      navigationTitle={`Content for ${screen.name}`}
      searchBarPlaceholder="Search playlists and files"
      isLoading={playlists.isLoading || files.isLoading}
      onSearchTextChange={setSearch}
      throttle
    >
      {loadError && nothing ? (
        <ErrorView
          error={loadError}
          onRetry={() => {
            playlists.revalidate();
            files.revalidate();
          }}
        />
      ) : (
        <List.EmptyView
          icon={Icon.List}
          title={q ? "No playlists or files match" : "No playlists or files"}
          description={q ? "Try a different name." : "Add a playlist or upload a file in Brix to see it here."}
        />
      )}
      <List.Section title="Playlists">
        {shownPlaylists.map((p) => (
          <List.Item
            key={p.id}
            icon={Icon.List}
            title={p.name}
            subtitle={p.description || undefined}
            accessories={[
              { text: `${p.items?.length ?? 0} ${(p.items?.length ?? 0) === 1 ? "item" : "items"}` },
              ...(screen.contentId === p.id ? [{ tag: "Now playing" }] : []),
            ]}
            actions={
              <ActionPanel>
                <Action title="Play on Screen" icon={Icon.Play} onAction={() => choose("playlist", p.id, p.name)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Files">
        {(files.data?.data ?? []).map((f) => (
          <List.Item
            key={f.id}
            icon={fileIcon(f)}
            title={f.name}
            accessories={[{ text: kindTitle(f.kind) }, ...(screen.contentId === f.id ? [{ tag: "Now playing" }] : [])]}
            actions={
              <ActionPanel>
                <Action title="Play on Screen" icon={Icon.Play} onAction={() => choose("media", f.id, f.name)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

/** Pick a screen for one playlist or file. */
export function ChooseScreen({
  contentKind,
  contentId,
  contentName,
}: {
  contentKind: "playlist" | "media";
  contentId: string;
  contentName: string;
}) {
  const { pop } = useNavigation();
  const [search, setSearch] = useState("");
  const { data, error, isLoading, revalidate } = useCachedPromise(
    (account: string, q: string) => {
      sameAccount(account);
      return getPage<Screen>("/v1/screens", { q: q || undefined, limit: 100 });
    },
    [accountId(), search],
    { keepPreviousData: true, failureToastOptions: { title: "Could not load screens" } },
  );
  return (
    <List
      navigationTitle={`Play ${contentName}`}
      searchBarPlaceholder="Search screens"
      isLoading={isLoading}
      onSearchTextChange={setSearch}
      throttle
    >
      {error && !data?.data.length ? (
        <ErrorView error={error} onRetry={revalidate} />
      ) : (
        <List.EmptyView
          icon={Icon.Monitor}
          title={search ? "No screens match" : "No screens"}
          description={search ? "Try a different name." : "Add a screen in Brix to see it here."}
        />
      )}
      {(data?.data ?? []).map((s) => (
        <List.Item
          key={s.id}
          icon={statusIcon(s)}
          title={s.name}
          subtitle={s.nodeName ?? undefined}
          accessories={[{ text: contentText(s) ?? statusText(s) }]}
          actions={
            <ActionPanel>
              <Action
                title="Play on This Screen"
                icon={Icon.Play}
                onAction={async () => {
                  if (await assignContent(s, contentKind, contentId, contentName)) pop();
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
