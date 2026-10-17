import { List, ActionPanel, Action, Icon } from "@raycast/api";
import OpenInCapacities from "./components/OpenInCapacities";
import { useEffect } from "react";
import { useCapacitiesStore } from "./helpers/storage";

export default function Command() {
  const { isLoading, store, triggerLoading } = useCapacitiesStore();

  useEffect(() => {
    triggerLoading();
  }, []);

  return (
    <List isLoading={isLoading}>
      {store?.spaces.map((space) => (
        <List.Item
          key={space.id}
          title={space.title}
          icon={Icon.Desktop}
          actions={
            <ActionPanel>
              <OpenInCapacities target={space.id} />
              <Action.CopyToClipboard content={space.id} title="Copy Space ID" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
