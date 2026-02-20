import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchRecitations } from "./lib/api";
import { Recitation } from "./types";

export default function Command() {
  const { data: recitations, isLoading } = useCachedPromise(fetchRecitations);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search reciters...">
      {recitations?.map((recitation: Recitation) => (
        <List.Item
          key={recitation.id}
          title={recitation.reciter_name}
          subtitle={recitation.style}
          icon={Icon.Person}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Reciter Name" content={recitation.reciter_name} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
