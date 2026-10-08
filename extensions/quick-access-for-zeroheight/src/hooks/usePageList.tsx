import { getPreferenceValues } from "@raycast/api";
import { showFailureToast, useFetch } from "@raycast/utils";

import { BASE_URL, formatPageName, getAuthHeaders, parseDate, StyleguidePageListResponse } from "../utils";

export function usePageList(styleguideId: number) {
  const { clientId, accessToken } = getPreferenceValues<Preferences>();

  const props = useFetch(`${BASE_URL}/styleguides/${styleguideId}/pages`, {
    method: "GET",
    headers: getAuthHeaders(clientId, accessToken),
    keepPreviousData: true,
    async onError(e) {
      if (e.message === "Unauthorized") {
        showFailureToast(e, {
          title: "Credentials are invalid",
          message: "Try updating your Client ID and Access Token in the extension settings.",
        });
      } else if (e.message === "Forbidden") {
        showFailureToast(e, {
          title: "Unable to list styleguide pages",
          message: "Ensure you have generated a token with the correct scopes.",
        });
      } else {
        showFailureToast(e, {
          title: "Failed to get styleguide page list",
          message: "Please try again later",
          primaryAction: {
            title: "Reload page list",
            onAction(toast) {
              props.revalidate();
              toast.hide();
            },
          },
        });
      }
    },
    mapResult(rawResponse: StyleguidePageListResponse) {
      const pages = rawResponse.data.pages.map((page) => {
        const createdAt = parseDate(page.created_at);
        const updatedAt = parseDate(page.updated_at || page.created_at);

        return {
          ...page,
          name: formatPageName(page.name),
          createdAt,
          humanCreatedAtDate: createdAt?.toLocaleDateString(),
          updatedAt,
          humanUpdatedAtDate: updatedAt?.toLocaleDateString(),
        };
      });

      return {
        data: pages,
      };
    },
  });

  return props;
}
