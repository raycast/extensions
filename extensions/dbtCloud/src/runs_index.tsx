import { List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { returnRuns } from "./fetch_runs";
import { RunsFetchResponse } from "./types";
import { JobRunsListItem } from "./runs_list_items";

export default function PackageList() {
  const [results, setTodos] = useState<RunsFetchResponse>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchAllJobsRun() {
      try {
        setLoading(true);
        await returnRuns().then((response) => {
          setTodos(response);
          setLoading(false);
        });
      } catch (error) {
        showToast(Toast.Style.Failure, "Failed loading Runs");
      }
    }

    fetchAllJobsRun();
  }, []);

  return (
    <List isLoading={loading} searchBarPlaceholder={`Filter Jobs`} throttle>
      <List.EmptyView title="No job run found" icon="icon_64p.png" />

      {results?.length
        ? results.map((result) => {
            return <JobRunsListItem key={result.id} result={result} />;
          })
        : null}
    </List>
  );
}
