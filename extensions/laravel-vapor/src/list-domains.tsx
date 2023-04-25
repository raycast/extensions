import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getDomains } from "./api/domains";
import ResultItem from "./components/ResultItem";

export default function Command() {
  const { data: domains, isLoading } = useCachedPromise(getDomains, [], { execute: true });

  return (
    <List isLoading={isLoading} isShowingDetail>
      {domains &&
        domains.map((domain) => (
          <ResultItem key={domain.id} id={domain.id} title={domain.zone} result={domain} type={"domain"} />
        ))}

      {!domains && <List.EmptyView title="No Domains" description="No domains found" />}
    </List>
  );
}
