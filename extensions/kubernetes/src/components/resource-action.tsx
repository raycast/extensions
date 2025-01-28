import { KubernetesObject } from "@kubernetes/client-node";
import { Action, ActionPanel } from "@raycast/api";
import { Toggle } from "../hooks/useToggle";

export default function ResourceAction<T extends KubernetesObject>(props: {
  resource: T;
  detailView: Toggle;
  managedFields: Toggle;
  lastAppliedConfiguration: Toggle;
}) {
  const { resource, detailView, managedFields, lastAppliedConfiguration } = props;

  return (
    <ActionPanel>
      <Action
        title={detailView.title}
        onAction={() => detailView.toggle()}
        icon={detailView.icon}
        shortcut={{ modifiers: ["cmd"], key: "d" }}
      />
      <Action.CopyToClipboard
        title="Copy Name to Clipboard"
        content={resource.metadata?.name ?? ""}
        shortcut={{ modifiers: ["cmd"], key: "c" }}
      />
      {detailView.show && (
        <Action
          title={managedFields.title}
          onAction={() => managedFields.toggle()}
          shortcut={{ modifiers: ["cmd"], key: "m" }}
          icon={managedFields.icon}
        />
      )}
      {detailView.show && (
        <Action
          title={lastAppliedConfiguration.title}
          onAction={() => lastAppliedConfiguration.toggle()}
          shortcut={{ modifiers: ["cmd"], key: "l" }}
          icon={lastAppliedConfiguration.icon}
        />
      )}
    </ActionPanel>
  );
}
