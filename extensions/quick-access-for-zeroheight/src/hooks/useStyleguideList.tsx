import { getPreferenceValues } from "@raycast/api";
import { showFailureToast, useFetch } from "@raycast/utils";

import { BASE_URL, getAuthHeaders, parseDate, StyleguideListItemData, StyleguideListResponse } from "../utils";

export function useStyleguideList() {
  const { clientId, accessToken } = getPreferenceValues<Preferences>();

  const props = useFetch<StyleguideListResponse, StyleguideListItemData[], StyleguideListItemData[]>(
    BASE_URL + "/styleguides",
    {
      method: "GET",
      headers: getAuthHeaders(clientId, accessToken),
      keepPreviousData: true,
      async onError(e) {
        if (e.message === "Unauthorized") {
          await showFailureToast(e, {
            title: "Credentials are invalid",
            message: "Try updating your Client ID and Access Token in the extension settings.",
          });
        } else if (e.message === "Forbidden") {
          await showFailureToast(e, {
            title: "Unable to list styleguides",
            message: "Ensure you have generated a token with the correct scopes.",
          });
        } else {
          await showFailureToast(e, {
            title: "Failed to get styleguide list",
            message: "Please try again later",
            primaryAction: {
              title: "Reload styleguide list",
              onAction(toast) {
                props.revalidate();
                toast.hide();
              },
            },
          });
        }
      },
      mapResult(rawResponse) {
        const styleguides = rawResponse.data.styleguides.map((styleguide) => {
          const createdAt = parseDate(styleguide.created_at);
          return {
            ...styleguide,
            name: styleguide.name ?? "Untitled styleguide",
            humanCreatedAt: createdAt?.toLocaleDateString(),
            createdAt: createdAt,
          };
        });

        return {
          data: styleguides,
        };
      },
    },
  );

  return props;
}
