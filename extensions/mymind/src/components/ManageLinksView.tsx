import {
  Action,
  ActionPanel,
  Alert,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { createLink, deleteLink, isManualLink, Link, linkPeerId, listLinks, listObjects, MyMindObject } from "../api";
import { dedupeById, safeHostname } from "../utils";

const PICK_LIMIT = 30;

interface LinkedRow {
  link: Link;
  peer: MyMindObject;
}

async function loadLinkedRows(objectId: string): Promise<LinkedRow[]> {
  const links = await listLinks({ objectId });
  if (links.length === 0) return [];
  const peerIds = Array.from(
    new Set(links.map((l) => linkPeerId(l, objectId)).filter((id): id is string => id != null)),
  );
  if (peerIds.length === 0) return [];
  const peers = await listObjects({ id: peerIds, limit: peerIds.length });
  const byId = new Map(peers.map((p) => [p.id, p]));
  return links
    .map((link) => {
      const peerId = linkPeerId(link, objectId);
      if (!peerId) return null;
      const peer = byId.get(peerId);
      if (!peer) return null;
      return { link, peer };
    })
    .filter((r): r is LinkedRow => r !== null);
}

function PickCardView({ excludeId, onPick }: { excludeId: string; onPick: (id: string) => Promise<void> | void }) {
  const { pop } = useNavigation();
  const [query, setQuery] = useState("");

  const { isLoading, data: matches = [] } = useCachedPromise(
    async (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) return [];
      const results = await listObjects({ q: trimmed, semantic: true, rerank: true, limit: PICK_LIMIT });
      return dedupeById(results.filter((o) => o.id !== excludeId));
    },
    [query],
    { keepPreviousData: true },
  );

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search for a card to link…"
      throttle
    >
      {!query.trim() && <List.EmptyView icon={Icon.MagnifyingGlass} title="Search to find a card to link" />}
      {query.trim() && matches.length === 0 && !isLoading && (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="No matches" />
      )}
      {matches.map((obj) => (
        <List.Item
          key={obj.id}
          title={obj.title || "Untitled"}
          subtitle={safeHostname(obj.source?.url) ?? obj.source?.url}
          actions={
            <ActionPanel>
              <Action
                title="Link"
                icon={Icon.Link}
                onAction={async () => {
                  await onPick(obj.id);
                  pop();
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export function ManageLinksView({ object, onChange }: { object: MyMindObject; onChange?: () => void }) {
  const {
    isLoading,
    data: rows = [],
    revalidate,
  } = useCachedPromise(loadLinkedRows, [object.id], {
    onError(err) {
      showFailureToast(err, { title: "Failed to load links" });
    },
  });

  const handleSaved = () => {
    revalidate();
    onChange?.();
  };

  const handleAddLink = async (targetId: string) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Linking…" });
    try {
      await createLink(object.id, targetId);
      toast.style = Toast.Style.Success;
      toast.title = "Linked";
      handleSaved();
    } catch (error) {
      toast.hide();
      await showFailureToast(error, { title: "Failed to link" });
    }
  };

  const handleUnlink = async (row: LinkedRow) => {
    if (!isManualLink(row.link)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "WikiLink",
        message: "Edit the source note's [[…]] reference to remove.",
      });
      return;
    }
    const proceed = await confirmAlert({
      title: "Remove link",
      message: `Unlink "${row.peer.title || "Untitled"}"?`,
      primaryAction: { title: "Unlink", style: Alert.ActionStyle.Destructive },
    });
    if (!proceed) return;
    const toast = await showToast({ style: Toast.Style.Animated, title: "Unlinking…" });
    try {
      await deleteLink(row.link.id);
      toast.style = Toast.Style.Success;
      toast.title = "Unlinked";
      handleSaved();
    } catch (error) {
      toast.hide();
      await showFailureToast(error, { title: "Failed to unlink" });
    }
  };

  const navTitle = object.title ? `Links on “${object.title}”` : "Manage Links";

  return (
    <List isLoading={isLoading} navigationTitle={navTitle}>
      <List.Section title="Actions">
        <List.Item
          icon={Icon.Plus}
          title="Link to Another Card"
          actions={
            <ActionPanel>
              <Action.Push
                title="Link to Another Card"
                icon={Icon.Plus}
                target={<PickCardView excludeId={object.id} onPick={handleAddLink} />}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title={`Linked (${rows.length})`}>
        {rows.length === 0 && !isLoading && <List.Item icon={Icon.Link} title="No links yet" />}
        {rows.map((row) => {
          const manual = isManualLink(row.link);
          return (
            <List.Item
              key={row.link.id}
              icon={manual ? Icon.Link : Icon.Document}
              title={row.peer.title || "Untitled"}
              subtitle={safeHostname(row.peer.source?.url) ?? row.peer.source?.url}
              accessories={manual ? undefined : [{ tag: "WikiLink" }]}
              actions={
                <ActionPanel>
                  {row.peer.source?.url && <Action.OpenInBrowser url={row.peer.source.url} />}
                  <Action
                    title={manual ? "Unlink" : "Can't Unlink WikiLinks"}
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => handleUnlink(row)}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
