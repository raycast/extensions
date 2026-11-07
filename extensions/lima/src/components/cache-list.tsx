import { Action, ActionPanel, Alert, confirmAlert, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { CachedFile, CACHE_DIR, deleteCached, listCache, totalBytes } from "../lib/cache";
import { size } from "../lib/instance";
import { pruneCache } from "../lib/lima";
import { ErrorView } from "./error-view";
import { ExtensionActions } from "./extension-actions";
import { cap, capPath } from "./instance-detail";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** "dev", "dev and pg", "dev, pg and k8s". */
function names(list: string[]): string {
  return list.length < 3 ? list.join(" and ") : `${list.slice(0, -1).join(", ")} and ${list.at(-1)}`;
}

function files(count: number): string {
  return `${count} ${count === 1 ? "file" : "files"}`;
}

/**
 * What Lima downloaded: disk images and archives, biggest first, split by whether an instance names them.
 * Deleting is safe for running instances, which each have their own copy; only making one again downloads it.
 */
export function CacheList() {
  const {
    data: cached,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(listCache, [], {
    onError(error) {
      if (cached?.length)
        showToast({ style: Toast.Style.Failure, title: "Couldn't read the cache", message: error.message });
    },
  });
  const [busy, setBusy] = useState(false);
  const unused = useMemo(() => (cached ?? []).filter((file) => !file.usedBy.length), [cached]);
  const used = useMemo(() => (cached ?? []).filter((file) => file.usedBy.length), [cached]);

  async function remove(targets: CachedFile[], title: string, message: string, task: () => Promise<void>) {
    const confirmed = await confirmAlert({
      title,
      message,
      icon: Icon.Trash,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    setBusy(true);
    const freed = size(totalBytes(targets));
    const toast = await showToast({ style: Toast.Style.Animated, title: `Deleting ${files(targets.length)}...` });
    try {
      await task();
      toast.style = Toast.Style.Success;
      toast.title = `Freed ${freed}`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't delete from the cache";
      toast.message = errorMessage(error);
    } finally {
      setBusy(false);
      revalidate();
    }
  }

  function removeOne(file: CachedFile) {
    const after = file.usedBy.length
      ? `${names(file.usedBy)} keep running: each has its own copy of its disk. Making ${file.usedBy.length === 1 ? "it" : "them"} again downloads it again.`
      : "No instance uses it. An instance made from it later downloads it again.";
    return remove([file], `Delete ${file.name}?`, `It frees ${size(file.bytes)}. ${after}`, () => deleteCached(file));
  }

  function removeUnused() {
    return remove(
      unused,
      `Delete ${files(unused.length)} no instance uses?`,
      `It frees ${size(totalBytes(unused))}. An instance made from them later downloads them again.`,
      async () => {
        for (const file of unused) await deleteCached(file);
      },
    );
  }

  function clearAll() {
    const all = cached ?? [];
    return remove(
      all,
      "Clear Lima's Whole Cache?",
      `It deletes ${files(all.length)} and frees ${size(totalBytes(all))}. Instances keep running: each has its own copy of its disk. Making any instance again downloads its image again.`,
      pruneCache,
    );
  }

  const bulkActions = (
    <ActionPanel.Section>
      {unused.length > 0 && (
        <Action
          title={`Delete ${unused.length} Unused`}
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={Keyboard.Shortcut.Common.RemoveAll}
          onAction={removeUnused}
        />
      )}
      {(cached?.length ?? 0) > 0 && (
        <Action title="Clear Entire Cache" icon={Icon.Eraser} style={Action.Style.Destructive} onAction={clearAll} />
      )}
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={revalidate}
      />
    </ActionPanel.Section>
  );

  const total = totalBytes(cached ?? []);
  const title = cached
    ? [files(cached.length), size(total), unused.length ? `${size(totalBytes(unused))} not used` : undefined]
        .filter(Boolean)
        .join(" · ")
    : undefined;

  const section = (heading: string, list: CachedFile[]) =>
    list.length > 0 && (
      <List.Section title={heading} subtitle={`${list.length} · ${size(totalBytes(list))}`}>
        {list.map((file) => (
          <List.Item
            key={file.dir}
            id={file.dir}
            icon={file.kind === "archive" ? Icon.Box : Icon.HardDrive}
            title={file.name}
            keywords={[...file.usedBy, file.url]}
            accessories={[{ text: size(file.bytes) }]}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="File" text={cap(file.name)} />
                    <List.Item.Detail.Metadata.Label title="Size" text={size(file.bytes)} />
                    <List.Item.Detail.Metadata.Label
                      title="Kind"
                      text={file.kind === "archive" ? "Archive" : "Disk Image"}
                    />
                    {file.downloaded && (
                      <List.Item.Detail.Metadata.Label
                        title="Downloaded"
                        text={file.downloaded.toLocaleDateString(undefined, { dateStyle: "medium" })}
                      />
                    )}
                    <List.Item.Detail.Metadata.Separator />
                    {file.usedBy.length ? (
                      file.usedBy.map((name, index) => (
                        <List.Item.Detail.Metadata.Label key={name} title={index === 0 ? "Used By" : ""} text={name} />
                      ))
                    ) : (
                      <List.Item.Detail.Metadata.Label title="Used By" text="No instance" />
                    )}
                    <List.Item.Detail.Metadata.Separator />
                    {file.url && <List.Item.Detail.Metadata.Link title="URL" text={cap(file.url)} target={file.url} />}
                    <List.Item.Detail.Metadata.Label title="Folder" text={capPath(file.dir)} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel title={file.name}>
                <ActionPanel.Section>
                  <Action
                    title="Delete from Cache"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={() => removeOne(file)}
                  />
                  <Action.ShowInFinder path={file.dir} shortcut={{ modifiers: ["cmd", "shift"], key: "f" }} />
                  {file.url && (
                    <Action.CopyToClipboard
                      title="Copy URL"
                      content={file.url}
                      shortcut={Keyboard.Shortcut.Common.Copy}
                    />
                  )}
                </ActionPanel.Section>
                {bulkActions}
                <ExtensionActions />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    );

  return (
    <List
      isLoading={isLoading || busy}
      isShowingDetail={(cached?.length ?? 0) > 0}
      navigationTitle={title}
      searchBarPlaceholder="Search by file, URL or instance"
    >
      {error && !cached ? (
        <ErrorView error={error} title="Couldn't Read the Cache" onRetry={revalidate} />
      ) : (
        <List.EmptyView
          icon={Icon.HardDrive}
          title="The Cache Is Empty"
          description={`Lima keeps what it downloads in ${capPath(CACHE_DIR)}. Nothing's there.`}
          actions={<ActionPanel>{bulkActions}</ActionPanel>}
        />
      )}
      {section("Not Used", unused)}
      {section("Used by Instances", used)}
    </List>
  );
}
