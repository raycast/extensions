import { getDomains } from "./libs/api";
import { ErrorView } from "./components/error-view";
import { DomainListItem } from "./types/nextdns";
import { removeItem } from "./libs/utils";
import { DomainList } from "./libs/domainList";

export default function Command() {
  const type = "allow";
  const { data, isLoading, error, mutate } = getDomains({ type });

  if (error) {
    return <ErrorView />;
  }

  async function handleRemoveItem(element: DomainListItem) {
    await removeItem(element, mutate);
  }

  return (
    <DomainList data={data || { result: [], profileName: "" }} isLoading={isLoading} onRemoveItem={handleRemoveItem} />
  );
}
