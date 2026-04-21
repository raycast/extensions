import { Action, ActionPanel, Alert, Grid, Icon, confirmAlert, showToast, Toast } from "@raycast/api";
import type { Block } from "../api/types";
import { useEffect, useState } from "react";
import { useArena } from "../hooks/useArena";
import { BlockActions } from "./BlockActions";
import type { MinimalChannel } from "../api/types";
import { getIconSource } from "../utils/icons";
import { EditChannelView } from "./editChannel";
import { ManageCollaboratorsView } from "./manageCollaborators";
import { CreateBlockView } from "./createBlock";
import { getPageSize } from "../utils/preferences";

interface ChannelRes {
  id?: number;
  title: string;
  slug: string;
  user: string;
  contents: Block[] | null;
  collaborators: number;
  canDelete: boolean;
  open?: boolean;
  hasMore: boolean;
}

export function ChannelView({ channel }: { channel: MinimalChannel }) {
  const arena = useArena();
  const pageSize = getPageSize();
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ChannelRes>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setIsLoading(true);
      try {
        const chan = arena.channel(channel.slug);
        const [fullChannel, { items: contents, hasMorePages }] = await Promise.all([
          chan.get(),
          chan.contents({
            sort: "position_desc",
            page,
            per: pageSize,
          }),
        ]);
        if (cancelled) return;
        setData((previous) => ({
          id: fullChannel.id,
          title: fullChannel.title,
          slug: fullChannel.slug,
          user: fullChannel.user.full_name,
          contents: page === 1 ? contents : [...(previous?.contents ?? []), ...contents],
          collaborators: fullChannel.collaborators.length,
          canDelete: Boolean(fullChannel.can?.destroy),
          open: fullChannel.open,
          hasMore: hasMorePages,
        }));
      } catch {
        if (!cancelled) setData(undefined);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [arena, channel.slug, page]);

  const blockCount = data?.contents?.length ?? 0;
  const subtitle = data
    ? `${data.user} · ${blockCount} block${blockCount === 1 ? "" : "s"} · ${data.collaborators} collaborator${data.collaborators === 1 ? "" : "s"}`
    : "";

  return (
    <Grid columns={4} isLoading={isLoading}>
      {isLoading && !data ? (
        <Grid.EmptyView icon={{ source: "extension-icon.png" }} title={`Loading ${channel.title}...`} />
      ) : data?.contents?.length === 0 ? (
        <Grid.EmptyView
          icon={{ source: "extension-icon.png" }}
          title="No blocks yet"
          description="Add a block to get started"
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Plus} title="Add New Block" target={<CreateBlockView channel={channel} />} />
            </ActionPanel>
          }
        />
      ) : (
        <Grid.Section title={data?.title} subtitle={subtitle}>
          {data?.contents?.map((block) => (
            <Grid.Item
              key={block.id}
              content={getIconSource(block)}
              title={block.title != null ? String(block.title) : ""}
              subtitle={`${block.user.full_name}—${block.class}`}
              actions={
                <BlockActions
                  block={block}
                  channel={channel}
                  extraActions={
                    <ActionPanel.Section>
                      <Action.Push
                        icon={Icon.Pencil}
                        title="Edit Channel"
                        target={<EditChannelView channel={channel} />}
                      />
                      <Action.Push
                        icon={Icon.Person}
                        title="Add Collaborators"
                        target={<ManageCollaboratorsView channel={channel} mode="add" />}
                      />
                      <Action.Push
                        icon={Icon.PersonLines}
                        title="Remove Collaborators"
                        target={<ManageCollaboratorsView channel={channel} mode="remove" />}
                      />
                      {data?.canDelete ? (
                        <Action
                          icon={Icon.Trash}
                          title="Delete Channel"
                          style={Action.Style.Destructive}
                          onAction={async () => {
                            const confirmed = await confirmAlert({
                              title: "Delete channel?",
                              message: "This cannot be undone.",
                              primaryAction: {
                                title: "Delete",
                                style: Alert.ActionStyle.Destructive,
                              },
                            });
                            if (!confirmed) return;
                            try {
                              await arena.channel(channel.slug).delete();
                              await showToast({
                                style: Toast.Style.Success,
                                title: "Channel deleted",
                                message: channel.title,
                              });
                            } catch {
                              await showToast({
                                style: Toast.Style.Failure,
                                title: "Failed to delete channel",
                              });
                            }
                          }}
                        />
                      ) : null}
                    </ActionPanel.Section>
                  }
                />
              }
            />
          ))}
          {data?.hasMore ? (
            <Grid.Item
              content={{ source: Icon.ArrowDownCircle }}
              title="Load More"
              actions={
                <ActionPanel>
                  <Action title="Load More" icon={Icon.ArrowDown} onAction={() => setPage((current) => current + 1)} />
                </ActionPanel>
              }
            />
          ) : null}
        </Grid.Section>
      )}
    </Grid>
  );
}
