import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getModels } from "./acme";

export default function Command() {
  const { data, isLoading } = useCachedPromise(getModels);
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter models…">
      {(data as { id: string; name: string }[] | undefined)?.map((model) => <List.Item key={model.id} title={model.name} />)}
    </List>
  );
}
