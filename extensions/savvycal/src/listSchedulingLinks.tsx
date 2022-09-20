import { List, showToast, Toast } from "@raycast/api";
import { useFetch, getFavicon } from "@raycast/utils";
import Link from "@/components/Link";
import { SchedulingLink, PaginatedList } from "@/utils/types";
import {
  SAVVYCAL_API_BASE_URL,
  apiToken,
  linksEndpoint,
} from "./utils/savvycal";

interface Links {
  links?: SchedulingLink[];
  error?: unknown;
}

export default function listSchedulingLinks() {
  const { isLoading, data } = useFetch<PaginatedList<SchedulingLink>>(
    SAVVYCAL_API_BASE_URL + linksEndpoint,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${Buffer.from(apiToken)}`,
        "Content-Type": "application/json",
      },
    }
  );

  return (
    <List
      enableFiltering={true}
      isLoading={isLoading}
      searchBarPlaceholder="Filter by link title..."
    >
      {data?.entries
        ? data.entries.map((link: SchedulingLink) => (
            <Link key={link.id} {...link} />
          ))
        : null}
    </List>
  );
}
