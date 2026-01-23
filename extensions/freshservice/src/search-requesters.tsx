import { List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { getAPIDetails } from "./utils/freshservice";
import RequesterListItem from "./components/RequesterListItem";
import { Requester } from "./utils/types";

export default function Command() {
  const { baseUrl, headers } = getAPIDetails();

  const { isLoading, data, pagination } = useFetch<
    { requesters: Requester[] },
    Requester[]
  >(
    (options) => {
      const params = new URLSearchParams();
      params.append("page", String(options.page + 1));
      params.append("per_page", "30");

      return `${baseUrl}/requesters?${params.toString()}`;
    },
    {
      headers,
      mapResult(result) {
        return {
          data: result.requesters || [],
          hasMore: (result.requesters?.length || 0) === 30,
        };
      },
      keepPreviousData: true,
      initialData: [] as Requester[],
    },
  );

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      searchBarPlaceholder="Search requesters by name..."
      filtering={{ keepSectionOrder: true }}
    >
      {(data as Requester[]).map((requester) => {
        const fullName =
          `${requester.first_name || ""} ${requester.last_name || ""}`.trim();
        return (
          <RequesterListItem
            key={requester.id}
            requester={requester}
            keywords={[
              fullName,
              requester.primary_email,
              requester.job_title || "",
            ].filter(Boolean)}
          />
        );
      })}
    </List>
  );
}
