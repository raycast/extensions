/**
 * S3 Backups command — mirrors the dashboard's S3 tab: list, download (via a
 * short-lived presigned URL) and delete objects in the configured S3 backup
 * bucket. Delete is gated as destructive (permanent object removal).
 */
import {
  Action,
  ActionPanel,
  Icon,
  Keyboard,
  List,
  Toast,
  open,
  showToast,
} from "@raycast/api";
import { api, postJson } from "./lib/api";
import { confirmDestructive, showFailureToast } from "./lib/confirm";
import { bytes } from "./lib/format";
import { useApi } from "./lib/hooks";
import type { S3List } from "./lib/types";

export default function Command() {
  const { data, isLoading, revalidate } = useApi<S3List>("/api/s3/list");
  const objects = data?.objects ?? [];

  async function download(key: string) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Getting link…",
    });
    try {
      const res = await api<{ url?: string }>(
        `/api/s3/presign?key=${encodeURIComponent(key)}`,
      );
      if (!res.url) throw new Error("No presigned URL returned");
      toast.hide();
      await open(res.url);
    } catch (e) {
      toast.hide();
      await showFailureToast(e, { title: "Could not create download link" });
    }
  }

  async function remove(key: string) {
    const ok = await confirmDestructive({
      title: `Delete “${key}”?`,
      message: "Permanently deletes this object from the S3 bucket.",
      actionTitle: "Delete",
    });
    if (!ok) return;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Deleting…",
    });
    try {
      const res = await postJson<{ ok?: boolean; error?: string }>(
        "/api/s3/delete",
        { key },
      );
      if (res.error) throw new Error(res.error);
      toast.style = Toast.Style.Success;
      toast.title = "Deleted";
      revalidate();
    } catch (e) {
      toast.hide();
      await showFailureToast(e, { title: "Could not delete object" });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter objects…">
      <List.Section
        title={data?.target ?? "S3"}
        subtitle={`${objects.length}${data?.truncated ? "+ (truncated)" : ""}`}
      >
        {objects.map((o) => (
          <List.Item
            key={o.key}
            icon={Icon.Box}
            title={o.key}
            accessories={[
              { text: bytes(o.size) },
              { date: new Date(o.lastModified) },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Download"
                  icon={Icon.Download}
                  onAction={() => download(o.key)}
                />
                <Action.CopyToClipboard
                  title="Copy Key"
                  content={o.key}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
                <Action
                  title="Delete"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() => remove(o.key)}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={revalidate}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.EmptyView
        icon={Icon.Box}
        title={data?.configured === false ? "S3 not configured" : "No objects"}
        description={
          data?.configured === false
            ? "Configure the s3 block in the server config to enable S3 backups."
            : "No backup objects in the bucket yet."
        }
      />
    </List>
  );
}
