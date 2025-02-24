import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";

import { BASE_URL, formatPageName, getAuthHeaders, StyleguidePageResponse } from "../utils";

export function usePage(pageId: number) {
  const { clientId, accessToken } = getPreferenceValues<Preferences>();

  const props = useFetch(`${BASE_URL}/pages/${pageId}`, {
    method: "GET",
    headers: getAuthHeaders(clientId, accessToken),
    keepPreviousData: true,
    async onError(e) {
      if (e.message === "Unauthorized") {
        await showToast({
          style: Toast.Style.Failure,
          title: "Credentials are invalid",
          message: "Try updating your Client ID and Access Token in the extension settings.",
        });
      } else if (e.message === "Forbidden") {
        await showToast({
          style: Toast.Style.Failure,
          title: "Unable to access page",
          message: "Ensure you have generated a token with the correct scopes.",
        });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to get page",
          message: "Please try again later",
          primaryAction: {
            title: "Reload page",
            onAction(toast) {
              props.revalidate();
              toast.hide();
            },
          },
        });
      }
    },
    mapResult(rawResponse: StyleguidePageResponse) {
      const page = rawResponse.data.page;

      const createdAt = new Date(page.created_at);
      const updatedAt = new Date(page.updated_at || page.created_at);

      return {
        data: {
          ...page,
          name: formatPageName(page.name),
          createdAt,
          humanCreatedAtDate: createdAt.toLocaleDateString(),
          updatedAt,
          humanUpdatedAtDate: updatedAt.toLocaleDateString(),
        },
      };
    },
  });

  return props;
}
