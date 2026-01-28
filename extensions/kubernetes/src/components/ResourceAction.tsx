import { KubernetesObject } from "@kubernetes/client-node";
import { Action, ActionPanel } from "@raycast/api";
import { Toggle } from "../hooks/useToggle";
import { RelatedResource, RelatedResourceAction } from "./RelatedResourceAction";

export default function ResourceAction<T extends KubernetesObject>(props: {
  resource: T;
  yamlView: Toggle;
  managedFields: Toggle;
  lastAppliedConfiguration: Toggle;
  relatedResource?: RelatedResource<T>;
}) {
  const { resource, yamlView, managedFields, lastAppliedConfiguration, relatedResource } = props;

  return (
    <ActionPanel>
      <RelatedResourceAction resource={resource} relatedResource={relatedResource} />
      <Action
        title={yamlView.title}
        onAction={() => yamlView.toggle()}
        icon={yamlView.icon}
        shortcut={{ modifiers: ["cmd"], key: "y" }}
      />
      <Action.CopyToClipboard
        title="Copy Name to Clipboard"
        content={resource.metadata?.name ?? ""}
        shortcut={{ modifiers: ["cmd"], key: "c" }}
      />
      {yamlView.show && (
        <Action
          title={managedFields.title}
          onAction={() => managedFields.toggle()}
          shortcut={{ modifiers: ["cmd"], key: "m" }}
          icon={managedFields.icon}
        />
      )}
      {yamlView.show && (
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
