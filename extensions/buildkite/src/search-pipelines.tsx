import { getPreferenceValues, List } from "@raycast/api";
import { useState } from "react";
import { Pipeline } from "./components/PipelineListItem";
import { PipelineListSection } from "./components/PipelineListSection";
import { Pager } from "./utils/types";
import { useQuery } from "./utils/useQuery";

interface QueryResponse {
  organization: {
    pipelines: Pager<Pipeline>;
  };
}

const QUERY = `
query SearchPipelinesQuery($org: ID!, $search: String) {
  organization(slug: $org) {
    pipelines(
      first: 20,
      archived: false,
      order: NAME_WITH_FAVORITES_FIRST,
      search: $search
    ) {
      edges {
        node {
          slug
          name
          description
          favorite
          url
          builds(first: 1) {
            edges {
              node {
                state
              }
            }
          }
        }
      }
    }
  }
}
`;

export default function Pipelines() {
  const { org } = getPreferenceValues();
  const [search, setSearch] = useState("");
  const { data, isLoading } = useQuery<QueryResponse>({
    query: QUERY,
    errorMessage: "Could not load pipelines",
    variables: { org, search },
  });

  const pipelines = data?.organization.pipelines.edges ?? [];

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter pipelines by name..."
      onSearchTextChange={(search) => setSearch(search)}
      throttle
    >
      <PipelineListSection title="Favorites" pipelines={pipelines.filter(({ node }) => node.favorite)} />
      <PipelineListSection title="All pipelines" pipelines={pipelines.filter(({ node }) => !node.favorite)} />
    </List>
  );
}
