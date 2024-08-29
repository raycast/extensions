import {
  Action,
  ActionPanel,
  getPreferenceValues,
  Icon,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect, useState } from "react";
import { ProwlarrApi, ReleaseResource } from "../prowlarrApi";
import { searchResultAccessories } from "./SearchResultAccessories";
import { SearchResultActionPanel } from "./SearchResultActionPanel";
import { SearchResultDetails } from "./SearchResultDetails";
import { SearchFormValues } from "./types";
import { getSearchResultSortPredicate } from "./utils";

const preference = getPreferenceValues<Preferences.Search>();
const _maxSearchResultsCount = Number.parseInt(preference.maxSearchResultsCount);
const maxSearchResultsCount = Number.isNaN(_maxSearchResultsCount) ? 100 : _maxSearchResultsCount;

const { api } = new ProwlarrApi({
  baseUrl: `${preference.protocol}://${preference.host}:${preference.port}${preference.urlBase}`,
  baseApiParams: { headers: { "X-Api-Key": preference.apiKey } },
});

export function SearchResultsList({ values }: { values: SearchFormValues }) {
  const [url, params] = api.v1SearchList({ query: values.search });

  const { isLoading, data, error } = useFetch(url, {
    ...params,
    mapResult: (response) => {
      const sortPredicate = getSearchResultSortPredicate(values);
      const sorted = response.data.sort(sortPredicate);
      const limited = sorted.slice(0, maxSearchResultsCount);

      return { data: limited };
    },
  });

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Connection Error",
      });
    }
  }, [error]);

  const [isShowingDetail, setIsShowingDetail] = useState(false);

  const addToDownloadClient = ({ guid, indexerId }: Pick<ReleaseResource, "guid" | "indexerId">) => {
    const [url, queryParams] = api.v1SearchCreate({ guid, indexerId });
    fetch(url, queryParams).then(() =>
      showToast({
        style: Toast.Style.Success,
        title: "Success!",
      }),
    );
  };

  const handleAction: Parameters<typeof SearchResultActionPanel>[0]["onAction"] = (params) => {
    switch (params.action) {
      case "addToDownloadClient":
        addToDownloadClient({ guid: params.item.guid, indexerId: params.item.indexerId });
        break;
      case "toggleDetails":
        setIsShowingDetail((v) => !v);
        break;
    }
  };

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={{ source: Icon.Warning }}
          title="Connection Error."
          description="Please check extension preferences and try again."
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} isShowingDetail={isShowingDetail}>
      {data?.map((item) => (
        <List.Item
          key={item.guid}
          title={item.title ?? ""}
          accessories={isShowingDetail ? undefined : searchResultAccessories({ item })}
          detail={<SearchResultDetails item={item} />}
          actions={<SearchResultActionPanel item={item} onAction={handleAction} />}
        />
      ))}
    </List>
  );
}
