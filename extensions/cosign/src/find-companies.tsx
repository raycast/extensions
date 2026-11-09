import type { LaunchProps } from "@raycast/api";
import { OrganizationActions, organizationContent } from "./components/entities";
import SearchList from "./components/SearchList";
import { fetchOrganization } from "./lib/api";
import type { OrganizationDetail, TopicCompanyResult } from "./lib/types";

export default function Command(props: LaunchProps<{ arguments: Arguments.FindCompanies }>) {
  return (
    <SearchList<TopicCompanyResult, OrganizationDetail>
      favoriteKind="organizations"
      recentsKey="topics"
      tool="search_companies"
      noun={["company", "companies"]}
      initialQuery={props.arguments.query}
      placeholder="Describe what the companies do"
      emptyDescription="Describe a topic, like “developer tools for AI agents”, then press Enter."
      args={(query, cursor) => ({ request: { action: "discover", args: { query, limit: 10, cursor } } })}
      nextCursor={(raw: { nextCursor: string | null }) => raw.nextCursor}
      pageSize={10}
      total={(raw: { rankedCount?: number }) => raw.rankedCount ?? null}
      results={(raw: { companies: TopicCompanyResult[] }) => raw.companies}
      toItem={(c) => ({
        id: c.organizationId,
        title: c.name,
        subtitle: c.descriptionExcerpt?.split("\n").pop() || undefined,
        imageUrl: c.imageUrl ?? undefined,
        url: c.url,
      })}
      fetchDetail={fetchOrganization}
      content={organizationContent}
      actions={(org) => <OrganizationActions org={org} />}
    />
  );
}
