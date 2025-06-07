import { List, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { PullRequest, fetchMyPRs } from "./utils/github";
import { PRLink } from "./components/PRLink";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [prs, setPrs] = useState<PullRequest[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPRs = async () => {
      setIsLoading(true);
      const result = await fetchMyPRs();
      setPrs(result.prs);
      setError(result.error);
      setIsLoading(false);
    };

    loadPRs();
  }, []);

  if (error) {
    return (
      <List isLoading={false}>
        <List.EmptyView icon={Icon.ExclamationMark} title="Error fetching PRs" description={error} />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter PRs...">
      {prs.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.CheckCircle}
          title="No PRs found"
          description="You don't have any open PRs at the moment."
        />
      ) : (
        prs.map((pr) => <PRLink key={pr.id} pr={pr} />)
      )}
    </List>
  );
}
