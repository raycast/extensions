import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getBuildkiteClient } from "./api/withBuildkiteClient";
import { BuildListItem } from "./components/BuildListItem";
import View from "./components/View";
import { truthy } from "./utils/truthy";

function MyBuilds() {
  const buildkite = getBuildkiteClient();
  const { data, isLoading } = useCachedPromise(
    async () => {
      const result = await buildkite.myBuilds();
      return result.viewer?.user?.builds?.edges?.map((edge) => edge?.node).filter(truthy);
    },
    [],
    { keepPreviousData: true },
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter builds by name...">
      {data?.map((node) => <BuildListItem key={node.id} build={node} />)}
    </List>
  );
}

export default function Command() {
  return (
    <View>
      <MyBuilds />
    </View>
  );
}
