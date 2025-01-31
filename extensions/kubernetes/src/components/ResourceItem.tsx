import { KubernetesObject } from "@kubernetes/client-node";
import { List } from "@raycast/api";
import { Toggle, useToggle } from "../hooks/useToggle";
import { getDarkColor, getLightColor } from "../utils/color";
import { RelatedResource } from "./RelatedResourceAction";
import ResourceAction from "./ResourceAction";
import ResourceDetail from "./ResourceDetail";

export default function ResourceItem<T extends KubernetesObject>(props: {
  apiVersion: string;
  kind: string;
  resource: T;
  yamlView: Toggle;
  renderFields: (resource: T) => string[];
  relatedResource?: RelatedResource<T>;
}) {
  const { apiVersion, kind, resource, yamlView, renderFields, relatedResource } = props;

  const managedFields = useToggle("Managed Fields", false);
  const lastAppliedConfiguration = useToggle("Last Applied Configuration", false);

  return (
    <List.Item
      key={resource.metadata?.uid}
      title={resource.metadata?.name ?? ""}
      detail={
        <ResourceDetail
          apiVersion={apiVersion}
          kind={kind}
          resource={resource}
          managedFields={managedFields}
          lastAppliedConfiguration={lastAppliedConfiguration}
        />
      }
      actions={
        <ResourceAction
          resource={resource}
          yamlView={yamlView}
          managedFields={managedFields}
          lastAppliedConfiguration={lastAppliedConfiguration}
          relatedResource={relatedResource}
        />
      }
      accessories={
        yamlView.show
          ? []
          : renderFields(resource).map((value, index) => ({
              tag: {
                value,
                color: {
                  light: getLightColor(index),
                  dark: getDarkColor(index),
                },
              },
            }))
      }
    />
  );
}
