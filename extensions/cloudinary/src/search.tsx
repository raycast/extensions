import { LaunchProps } from "@raycast/api";

import { searchAssets } from "./lib/cloudinary";
import type { Asset } from "./types/asset";

import ViewResources from "./components/ViewResources";
import { showFailureToast, useCachedPromise } from "@raycast/utils";

export default function main(props: LaunchProps<{ arguments: Arguments.Search }>) {
  const {
    isLoading,
    data: assets,
    pagination,
  } = useCachedPromise(
    () => async (options) => {
      const { resources, next_cursor } = await searchAssets({
        query: props.arguments.query,
        tag: props.arguments.tag,
        cursor: options.cursor,
      });
      return {
        data: resources as Array<Asset>,
        hasMore: !!next_cursor,
        cursor: next_cursor,
      };
    },
    [],
    {
      initialData: [],
      onError(error) {
        const message = typeof error.message === "string" ? error.message : "Search Error";
        showFailureToast(message, { title: "Error" });
      },
    },
  );

  return <ViewResources resources={assets} isLoading={isLoading} pagination={pagination} />;
}
