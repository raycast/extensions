import { Toast, showToast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { parseLinkHeader } from "@web3-storage/parse-link-header";

const MAX_PAGE_SIZE = "50";

export default function useASOIAF<T>(resource: "books" | "characters" | "houses") {
  const properCaseResource = resource.charAt(0).toUpperCase() + resource.substring(1);

  const { isLoading, data, pagination } = useFetch(
    (options) =>
      `https://www.anapioficeandfire.com/api/${resource}?` +
      new URLSearchParams({ page: String(options.page + 1), pageSize: MAX_PAGE_SIZE }).toString(),
    {
      async parseResponse(response) {
        // Information about the pagination is included in the Link header (https://tools.ietf.org/html/rfc5988)
        const parsed = parseLinkHeader(response.headers.get("Link"));
        const data = (await response.json()) as T[];
        return {
          data,
          hasMore: Boolean(parsed && Object.hasOwn(parsed, "next")),
        };
      },
      mapResult(result) {
        return {
          data: result.data,
          hasMore: result.hasMore,
        };
      },
      async onWillExecute() {
        await showToast(Toast.Style.Animated, `Fetching ${properCaseResource}`);
      },
      async onData(data) {
        await showToast(Toast.Style.Success, `Fetched ${data.length} ${properCaseResource}`);
      },
      keepPreviousData: true,
      initialData: [],
    },
  );

  return { isLoading, data, pagination };
}
