import { List } from "@raycast/api";
import { returnRuns } from "./fetch_runs";
import { JobRunsListItem } from "./runs_list_items";
import { useCachedPromise } from "@raycast/utils";

export default function PackageList() {
  const { isLoading, data: results } = useCachedPromise(returnRuns, [], {
    failureToastOptions: {
      title: "Failed loading Runs",
    },
    initialData: [],
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder={`Filter Jobs`} throttle>
      <List.EmptyView title="No job run found" icon="icon_64p.png" />

      {results.map((result) => {
        return <JobRunsListItem key={result.id} result={result} />;
      })}
    </List>
  );
}
