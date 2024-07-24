import { useCachedPromise } from "@raycast/utils";
import { CONTENTFUL } from "./lib/contentful";
import { Action, ActionPanel, Grid } from "@raycast/api";
import { CONTENTFUL_APP_URL, CONTENTFUL_LIMIT, CONTENTFUL_SPACE } from "./lib/config";

export default function SearchAssets() {
    const { isLoading, data: assets, pagination } = useCachedPromise(
        () => async (options: { page: number }) => {
          const skip = options.page * CONTENTFUL_LIMIT;
          const response = await CONTENTFUL.asset.getMany({
            query: {
              skip,
              limit: CONTENTFUL_LIMIT
            }
          });

          const hasMore = (CONTENTFUL_LIMIT*options.page) < response.total;
          return {
            data: response.items,
            hasMore
          }
        }, [], {
          initialData: [],
         keepPreviousData: true
        }
      );

      return <Grid isLoading={isLoading} pagination={pagination} searchBarPlaceholder="Search assets">
        {assets.map(asset => {
          const url = `${CONTENTFUL_APP_URL}spaces/${CONTENTFUL_SPACE}/assets/${asset.sys.id}`;
          return <Grid.Item key={asset.sys.id} title={asset.fields.title["en-US"]} content={"https:" + asset.fields.file["en-US"].url} actions={<ActionPanel>
          <Action.OpenInBrowser url={url} />
        </ActionPanel>} />})}
      </Grid>
}