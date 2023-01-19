import { List } from "@raycast/api";
import { Build, BuildListItem } from "./components/BuildListItem";
import { Pager } from "./utils/types";
import { useQuery } from "./utils/useQuery";

interface QueryResponse {
  viewer: {
    user: {
      builds: Pager<Build>;
    };
  };
}

const QUERY = `
query {
  viewer {
    user {
      builds(first: 20) {
        edges {
          node {
            id
            branch
            createdAt
            message
            number
            state
            url
            pipeline {
              name
            }
          }
        }
      }
    }
  }
}
`;

export default function MyBuilds() {
  const { data, isLoading } = useQuery<QueryResponse>({
    query: QUERY,
    errorMessage: "Could not load builds",
  });

  const builds = data?.viewer.user.builds.edges ?? [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter builds by name...">
      {builds.map(({ node }) => (
        <BuildListItem key={node.id} build={node} />
      ))}
    </List>
  );
}
