import { getPreferenceValues, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getBuildkiteClient } from "../api/withBuildkiteClient";
import { BuildFragment } from "../generated/graphql";
import { truthy } from "../utils/truthy";
import { BuildListItem } from "./BuildListItem";

function groupBranches(acc: Record<string, BuildFragment[]>, node: BuildFragment) {
  acc[node.branch] = [...(acc[node.branch] ?? []), node];
  return acc;
}

const preferences = getPreferenceValues<{ favoriteBranches: string }>();
const favoriteBranches = new Set(preferences.favoriteBranches.split(",").map((branch) => branch.trim()));

function sortBranches(a: [string, BuildFragment[]], b: [string, BuildFragment[]]) {
  const hasA = favoriteBranches.has(a[0]);
  const hasB = favoriteBranches.has(b[0]);

  return hasA && !hasB ? -1 : hasB && !hasA ? 1 : 0;
}

interface BuildsProps {
  pipeline: string;
}

export function Builds({ pipeline }: BuildsProps) {
  const buildkite = getBuildkiteClient();
  const { data, isLoading } = useCachedPromise(
    async (pipeline: string) => {
      const result = await buildkite.listBuilds({ pipeline });
      return result.pipeline?.builds?.edges?.map((edge) => edge?.node).filter(truthy);
    },
    [pipeline],
    { keepPreviousData: true },
  );

  const branches = Object.entries((data ?? []).reduce(groupBranches, {})).sort(sortBranches);

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
