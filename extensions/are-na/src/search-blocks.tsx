import { useRef } from "react";
import { Grid, LaunchProps } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useArena } from "./hooks/useArena";
import type { SearchBlocksResponse } from "./api/types";
import { usePromise } from "@raycast/utils";
import { BlockActions } from "./components/BlockActions";
import { getIconSource } from "./utils/icons";

export default function Command(props: LaunchProps<{ arguments: Arguments.SearchBlocks }>) {
  const abortable = useRef<AbortController | null>(null);
  const arena = useArena();
  const { query } = props.arguments;
  const { data, isLoading } = usePromise(
    async (q: string): Promise<SearchBlocksResponse> => {
      try {
        const response = await arena.search(q).blocks({ per: 100 });
        return response;
      } catch (error) {
        showFailureToast(error, { title: "Failed to search blocks" });
        return { blocks: [], term: q, total_pages: 0, current_page: 1, per: 100 };
      }
    },
    [query],
    {
      abortable,
    },
  );
  const hasNoResults = data?.blocks.length === 0;

  return (
    <Grid columns={4} isLoading={isLoading}>
      <Grid.Section title="Search Results">
        {hasNoResults ? (
          <Grid.EmptyView icon={{ source: "extension-icon.png" }} title="No results found" />
        ) : (
          data?.blocks.map((block, index) => (
            <Grid.Item
              key={block.id || index}
              content={getIconSource(block)}
              title={block.title ?? ""}
              subtitle={block.class}
              actions={<BlockActions block={block} />}
            />
          ))
        )}
      </Grid.Section>
    </Grid>
  );
}
