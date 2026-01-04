import { Action, ActionPanel, Grid, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { resizedImage } from "@/utils";
import { PicsumImage } from "@/types";

type PicsumResponse = { data: PicsumImage[]; hasMore: boolean };

export default function Command() {
  //@ts-expect-error This works, but the types for useFetch are not correct
  const { isLoading, data, pagination } = useFetch<PicsumResponse, PicsumImage[], PicsumImage[]>(
    (options) => `https://picsum.photos/v2/list?page=${options.page + 1}&limit=100`,
    {
      parseResponse: async (response) => {
        const headers = response.headers;
        const link = headers.get("Link");
        const hasMore = link?.includes('rel="next"');
        const data = (await response.json()) as PicsumImage[];
        return { data, hasMore: hasMore ?? false };
      },
      keepPreviousData: true,
      initialData: [],
    },
  );
  return (
    <Grid isLoading={isLoading} pagination={pagination} filtering={false}>
      {data.map((image) => (
        <Grid.Item
          key={image.id}
          title={image.author}
          content={resizedImage(image, 200)}
          subtitle={`${image.width}x${image.height}`}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Original Page" icon={Icon.Globe} url={image.url} />
              <Action.OpenInBrowser title="Open Image in Browser" icon={Icon.Globe} url={image.download_url} />
              <Action.CopyToClipboard title="Copy Image URL" icon={Icon.Clipboard} content={image.download_url} />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
