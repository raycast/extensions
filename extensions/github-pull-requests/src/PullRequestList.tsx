import { List } from "@raycast/api";
import { useState, useEffect } from "react";
import fetchPullRequests from "./fetchPullRequests";
import PullRequestItem from "./PullRequestItem";
import { PullRequests } from "./types";

export default function PullRequestList() {
  const [state, setState] = useState<PullRequests>({
    pullRequests: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const pullRequests = await fetchPullRequests();

      setState((oldState) => ({
        ...oldState,
        pullRequests: pullRequests,
      }));

      setIsLoading(false);
    }

    fetch();
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter Pull Requests by name...">
      {state.pullRequests.map((pr) => (
        <PullRequestItem key={pr.url} {...pr} />
      ))}
    </List>
  );
}
