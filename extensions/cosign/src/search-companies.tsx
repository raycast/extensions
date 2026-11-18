import type { LaunchProps } from "@raycast/api";
import { OrganizationActions, organizationContent } from "./components/entities";
import SearchList from "./components/SearchList";
import { fetchOrganization } from "./lib/api";
import type { OrganizationDetail, OrganizationResult } from "./lib/types";

export default function Command(props: LaunchProps<{ arguments: Arguments.SearchCompanies }>) {
  return (
    <SearchList<OrganizationResult, OrganizationDetail>
      favoriteKind="organizations"
      recentsKey="companies"
      tool="search_companies"
      noun={["company", "companies"]}
      initialQuery={props.arguments.query}
      placeholder="Search companies and firms by name"
      emptyDescription="Type a company name, then press Enter."
      args={(query) => ({ request: { action: "name", args: { query } } })}
      results={(raw: { items: OrganizationResult[] }) => raw.items}
      toItem={(o) => ({
        id: o.organizationId,
        title: o.name,
        imageUrl: o.imageUrl ?? undefined,
        verified: o.verified,
        url: o.url,
      })}
      fetchDetail={fetchOrganization}
      content={organizationContent}
      actions={(org) => <OrganizationActions org={org} />}
    />
  );
}
