import "./lib/patch-url.js";

import { Action, ActionPanel, getPreferenceValues, List, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { ENVELOPES_PAGE_SIZE, listEnvelopes, listWorkspaces } from "./lib/subnoto.js";
import type { Envelope, Preferences, Workspace } from "./lib/types.js";

const LIST_PAGE_SIZE = 20;

/** Normalize API timestamp (seconds or milliseconds) to Date. */
function toDate(timestamp: number): Date {
  return timestamp < 1e12 ? new Date(timestamp * 1000) : new Date(timestamp);
}

function formatDate(timestamp: number): string {
  const d = toDate(timestamp);
  try {
    return d.toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return d.toLocaleString("en-GB");
  }
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspacesLoading, setWorkspacesLoading] = useState(true);
  const [selectedWorkspaceUuid, setSelectedWorkspaceUuid] = useState<string>("");
  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const [envelopesLoading, setEnvelopesLoading] = useState(false);
  const [envelopesError, setEnvelopesError] = useState<Error | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshDeps, setRefreshDeps] = useState(0);

  const workspaceFilter = selectedWorkspaceUuid === "" ? undefined : selectedWorkspaceUuid;

  useEffect(() => {
    async function load() {
      try {
        const data = await listWorkspaces(preferences);
        setWorkspaces(data);
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load workspaces",
          message: e.message,
        });
      } finally {
        setWorkspacesLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setEnvelopesLoading(true);
    setEnvelopesError(null);
    setPage(1);
    setEnvelopes([]);
    setHasMore(false);

    listEnvelopes(preferences, workspaceFilter, 1)
      .then((data) => {
        if (!cancelled) {
          setEnvelopes(data);
          setHasMore(data.length === ENVELOPES_PAGE_SIZE);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          const e = err instanceof Error ? err : new Error(String(err));
          setEnvelopesError(e);
          setEnvelopes([]);
          showToast({
            style: Toast.Style.Failure,
            title: "Failed to load envelopes",
            message: e.message,
          });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setEnvelopesLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceFilter, refreshDeps]);

  const onLoadMore = useCallback(() => {
    if (loadingMore) return;
    const nextPage = page + 1;
    setLoadingMore(true);
    listEnvelopes(preferences, workspaceFilter, nextPage)
      .then((data) => {
        setEnvelopes((prev) => [...prev, ...data]);
        setHasMore(data.length === ENVELOPES_PAGE_SIZE);
        setPage(nextPage);
      })
      .finally(() => setLoadingMore(false));
  }, [page, loadingMore, preferences, workspaceFilter]);

  const selectedWorkspace = workspaces.find((w) => w.uuid === selectedWorkspaceUuid);
  const isLoading = workspacesLoading || envelopesLoading;

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Envelopes"
      searchBarPlaceholder="Search envelopes..."
      pagination={{
        onLoadMore: onLoadMore,
        hasMore,
        pageSize: LIST_PAGE_SIZE,
      }}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select workspace"
          storeValue
          value={selectedWorkspaceUuid}
          onChange={setSelectedWorkspaceUuid}
        >
          <List.Dropdown.Section title="Workspaces">
            <List.Dropdown.Item key="__all__" value="" title="All" />
            {workspaces.map((w) => (
              <List.Dropdown.Item key={w.uuid} value={w.uuid} title={w.name} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <List.EmptyView
        title={envelopesError ? "Failed to load envelopes" : "No envelopes"}
        description={
          envelopesError
            ? envelopesError.message
            : selectedWorkspaceUuid === ""
              ? "No envelopes across your workspaces."
              : selectedWorkspace
                ? `No envelopes in "${selectedWorkspace.name}" yet.`
                : ""
        }
      />
      {envelopes.map((envelope) => (
        <List.Item
          key={envelope.uuid}
          id={envelope.uuid}
          title={envelope.title || "Untitled"}
          subtitle={envelope.status}
          keywords={[envelope.status, ...envelope.tags]}
          accessories={[
            {
              text: formatDate(envelope.updateDate),
              tooltip: `Updated ${formatDate(envelope.updateDate)}`,
            },
            {
              text: `${envelope.metrics.signatureCount}/${envelope.metrics.signatureRequiredCount} signatures`,
            },
          ]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                url={`https://app.subnoto.com/envelopes/${envelope.workspaceUuid}/${envelope.uuid}/edit`}
                title="Open in Subnoto"
              />
              <Action.CopyToClipboard content={envelope.uuid} title="Copy Envelope UUID" />
              <Action title="Refresh" onAction={() => setRefreshDeps((d) => d + 1)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
