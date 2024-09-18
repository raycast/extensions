import { Action, ActionPanel, Grid } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { fetchUnPhotos } from "./api.js";

export default function () {
  const { isLoading, data, pagination } = usePromise(
    () =>
      async ({ page }: { page: number }) => {
        const nextPhotos = await fetchUnPhotos(page);
        return { data: nextPhotos, hasMore: nextPhotos.length >= 16 };
      },
    [],
  );

  return (
    <Grid isLoading={isLoading} columns={4} aspectRatio="3/2" pagination={pagination}>
      {data?.map((card, index) => (
        <Grid.Item
          key={`card-${index}`}
          title={card.title}
          subtitle={card.datetime}
          content={{ source: card.thumbImage }}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={card.pageUrl} />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
