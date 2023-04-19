import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getDomains } from "./api/domains";
import ResultItem from "./components/ResultItem";

export default function Command() {
  const { data: domains, isLoading } = useCachedPromise(getDomains, [], { execute: true });

  return (
    <List isShowingDetail>
      {!isLoading &&
        domains &&
        domains.map((domain) => (
          <ResultItem key={domain.id} id={domain.id} title={domain.zone} result={domain} type={"domain"} />
        ))}

      {isLoading && <List.Item title="Loading..." />}

      {!isLoading && !domains && <List.EmptyView title="No domains" description="No domains found" />}
    </List>
  );
}
