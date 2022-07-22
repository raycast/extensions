import { getPreferenceValues, List } from "@raycast/api";
import { Pager } from "../utils/types";
import { useQuery } from "../utils/useQuery";
import { Build, BuildListItem } from "./BuildListItem";

function groupBranches(acc: Record<string, Build[]>, { node }: Pager<Build>["edges"][number]) {
  acc[node.branch] = [...(acc[node.branch] ?? []), node];
  return acc;
}

const preferences = getPreferenceValues<{ favoriteBranches: string }>();
const favoriteBranches = new Set(preferences.favoriteBranches.split(",").map((branch) => branch.trim()));

function sortBranches(a: [string, Build[]], b: [string, Build[]]) {
  const hasA = favoriteBranches.has(a[0]);
  const hasB = favoriteBranches.has(b[0]);

  return hasA && !hasB ? -1 : hasB && !hasA ? 1 : 0;
}

const QUERY = `
query ListBuildsQuery($pipeline: ID!) {
  pipeline(slug: $pipeline) {
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
        }
      }
    }
  }
}
`;

interface QueryResponse {
  pipeline: {
    builds: Pager<Build>;
  };
}

interface BuildsProps {
  pipeline: string;
}

export function Builds({ pipeline }: BuildsProps) {
  const { data, isLoading } = useQuery<QueryResponse>({
    query: QUERY,
    errorMessage: "Could not load builds",
    variables: { pipeline },
  });

  const builds = data?.pipeline.builds.edges ?? [];
  const branches = Object.entries(builds.reduce(groupBranches, {})).sort(sortBranches);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter builds by name...">
      {branches.map(([name, builds]) => (
        <List.Section key={name} title={name}>
          {builds.map((build) => (
            <BuildListItem key={build.id} build={build} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
