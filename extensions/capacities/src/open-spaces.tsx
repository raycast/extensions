import { List, ActionPanel, Action } from "@raycast/api";
import { checkCapacitiesApp } from "./helpers/isCapacitiesInstalled";
import OpenInCapacities from "./components/OpenInCapacities";
import { useEffect } from "react";
import { useCapacitiesStore } from "./helpers/storage";
import ErrorView from "./components/ErrorView";

export default function Command() {
  useEffect(() => {
    checkCapacitiesApp();
  }, []);

  const { isLoading, store, error, triggerLoading } = useCapacitiesStore();

  useEffect(() => {
    triggerLoading();
  }, []);

  return error ? (
    <ErrorView error={error} />
  ) : (
    <List isLoading={isLoading}>
      {store?.spaces.map((space) => (
        <List.Item
          key={space.id}
          title={space.title}
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
