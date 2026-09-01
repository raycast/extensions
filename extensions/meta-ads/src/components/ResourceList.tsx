import { Action, ActionPanel, Alert, Color, Icon, List, Toast, confirmAlert, showToast, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import type { ComponentProps } from "react";
import { MissingCredentials, useCredentialsGuard } from "./MissingCredentials";
import { deleteResource, listResource } from "../lib/cli";
import { MetaRecord } from "../lib/types";

type PushTarget = ComponentProps<typeof Action.Push>["target"];

interface Config {
  resource: "campaign" | "adset" | "ad" | "creative";
  parentId?: string;
  newItem?: {
    title: string;
    target: PushTarget;
  };
  fromItem?: {
    title: string;
    target: (record: MetaRecord) => PushTarget;
  };
}

function statusColor(status?: string) {
  const value = (status ?? "").toUpperCase();
  if (value.includes("ACTIVE")) return Color.Green;
  if (value.includes("PAUSED")) return Color.Yellow;
  if (value.includes("ARCHIVED") || value.includes("DELETED")) return Color.SecondaryText;
  return Color.Blue;
}

export function ResourceList({ resource, parentId, newItem, fromItem }: Config) {
  const { isReady, isLoading: credsLoading } = useCredentialsGuard();
  const { data, isLoading, error, revalidate } = useCachedPromise(
    async (res: Config["resource"], pid?: string) => listResource(res, pid),
    [resource, parentId],
    { execute: isReady },
  );

  async function handleDelete(record: MetaRecord) {
    const confirmed = await confirmAlert({
      title: "삭제할까요?",
      message: `${record.name || record.id}를 삭제합니다. 하위 객체도 함께 삭제될 수 있습니다.`,
      primaryAction: { title: "삭제", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    const toast = await showToast({ style: Toast.Style.Animated, title: "삭제 중" });
    try {
      await deleteResource(resource, record.id);
      toast.style = Toast.Style.Success;
      toast.title = "삭제했습니다";
      revalidate();
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "삭제 실패";
      toast.message = err instanceof Error ? err.message : String(err);
    }
  }

  if (credsLoading) {
    return <List isLoading />;
  }
  if (!isReady) {
    return <MissingCredentials />;
  }

  const records = data ?? [];

  const createActions = (record?: MetaRecord) => (
    <ActionPanel>
      {record && fromItem ? (
        <Action.Push title={fromItem.title} icon={Icon.Plus} target={fromItem.target(record)} />
      ) : null}
      {newItem ? <Action.Push title={newItem.title} icon={Icon.PlusCircle} target={newItem.target} /> : null}
      {record ? <Action.CopyToClipboard title="ID 복사" content={record.id} /> : null}
      <Action
        title="새로고침"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={revalidate}
      />
      {record ? (
        <Action
          title="삭제"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={Keyboard.Shortcut.Common.Remove}
          onAction={() => handleDelete(record)}
        />
      ) : null}
    </ActionPanel>
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="이름 또는 ID 검색">
      {error ? (
        <List.EmptyView icon={Icon.Warning} title="조회 실패" description={error.message} actions={createActions()} />
      ) : records.length === 0 ? (
        <List.EmptyView
          icon={Icon.Megaphone}
          title="항목이 없습니다"
          description={newItem?.title}
          actions={createActions()}
        />
      ) : (
        records.map((record) => {
          const status = String(record.effective_status ?? record.status ?? "");
          const accessories = [
            status ? { tag: { value: status, color: statusColor(status) } } : undefined,
            record.objective ? { text: String(record.objective) } : undefined,
            record.optimization_goal ? { text: String(record.optimization_goal) } : undefined,
          ].filter((item): item is { tag: { value: string; color: Color } } | { text: string } => Boolean(item));

          return (
            <List.Item
              key={record.id}
              title={String(record.name || record.id)}
              subtitle={record.id}
              accessories={accessories}
              actions={createActions(record)}
            />
          );
        })
      )}
    </List>
  );
}
