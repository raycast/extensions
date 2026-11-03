import { OrganizationActions, organizationContent } from "./components/entities";
import SearchList from "./components/SearchList";
import { fetchOrganization } from "./lib/api";
import type { OrganizationDetail, OrganizationResult } from "./lib/types";

export default function Command() {
  return (
    <SearchList<OrganizationResult, OrganizationDetail>
      favoriteKind="organizations"
      recentsKey="companies"
      tool="search_organizations"
      noun={["company", "companies"]}
      placeholder="Search companies and firms by name"
      emptyDescription="Type a company name, then press Enter."
      reason="User searched for companies by name from the Raycast extension"
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
