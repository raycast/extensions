import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";
import { useState } from "react";
import type { Preferences, ValidationResult } from "./types";
import { parseInstances } from "./tools/validation";
import { refreshInstance } from "./tools/refresh-instance";

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const [validationResult] = useState<ValidationResult>(() =>
    parseInstances(prefs),
  );

  if (!validationResult.valid) {
    showToast({
      style: Toast.Style.Failure,
      title: "Invalid Configuration",
      message: validationResult.error,
    });
    openExtensionPreferences();
    return <List />;
  }

  const instances = validationResult.instances!;

  // If only one instance, refresh it immediately
  if (instances.length === 1) {
    refreshInstance(instances[0]);
    return <List />;
  }

  // Multiple instances - show selection list
  return (
    <List searchBarPlaceholder="Select Kibana instance to refresh...">
      {instances.map((instance, index) => (
        <List.Item
          key={index}
          title={instance.name}
          subtitle={instance.url}
          accessories={[{ text: instance.apiKey ? "API Key" : "Basic Auth" }]}
          actions={
            <ActionPanel>
              <Action
                title="Refresh This Instance"
                onAction={() => refreshInstance(instance)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
