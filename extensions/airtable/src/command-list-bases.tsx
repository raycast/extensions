import { Detail } from "@raycast/api";

import * as airtable from "./oauth-client";
import { BaseList } from "./BaseList";
import * as api from "./metadata-api";
import { getNumberOfClicksByBaseIdAsync } from "./LocalStorageWrapper";
import { showFailureToast, useCachedPromise, usePromise, withAccessToken } from "@raycast/utils";

export default withAccessToken(airtable.provider)(Command);

function Command() {
  const { isLoading: isLoadingClicksByBase, data: numberOfClicksByBaseId = {} } =
    usePromise(getNumberOfClicksByBaseIdAsync);

  const { isLoading, data: bases } = useCachedPromise(api.fetchBaseList, [], {
    initialData: api.getCachedBaseList(),
    async onError(error) {
      await showFailureToast("", { title: error.message });
    },
  });

  if ((isLoading && bases.length === 0) || isLoadingClicksByBase) {
    return <Detail isLoading={isLoading} />;
  }

  return <BaseList isLoading={isLoading} bases={bases} numberOfClicksByBaseId={numberOfClicksByBaseId} />;
}
