import { Grid } from "@raycast/api";
import type { Block } from "../api/types";
import { useRef } from "react";
import { useArena } from "../hooks/useArena";
import { usePromise } from "@raycast/utils";
import { BlockActions } from "./BlockActions";
import type { MinimalChannel } from "../api/types";
import { getIconSource } from "../utils/icons";

interface ChannelRes {
  title: string;
  slug: string;
  user: string;
  contents: Block[] | null;
  connections: number;
  open?: boolean;
}

export function ChannelView({ channel }: { channel: MinimalChannel }) {
  const abortable = useRef<AbortController | null>(null);
  const arena = useArena();
  const { data, isLoading } = usePromise(
    async (): Promise<ChannelRes> => {
      const chan = arena.channel(channel.slug, {
        sort: "position",
        direction: "desc",
        per: 100,
      });
      const contents = await chan.contents();
      return {
        title: channel.title,
        slug: channel.slug,
        user: typeof channel.user === "string" ? channel.user : channel.user.full_name,
        contents: contents,
        connections: (await chan.connections()).length,
        open: channel.open,
      };
    },
    [],
    {
      abortable,
    },
  );

  return (
    <Grid columns={4} isLoading={isLoading}>
      {data?.contents?.length === 0 ? (
        <Grid.EmptyView
          icon={{ source: "extension-icon.png" }}
          title="No blocks found"
          actions={<BlockActions channel={channel} />}
        />
      ) : (
        <Grid.Section title={data?.title} subtitle={data?.user}>
          {data?.contents?.map((block) => (
            <Grid.Item
              key={block.id}
              content={getIconSource(block)}
              title={block.title ?? ""}
              subtitle={`${block.user.full_name}—${block.class}`}
              actions={<BlockActions block={block} channel={channel} />}
            />
          ))}
        </Grid.Section>
      )}
    </Grid>
  );
}
