import { KubernetesObject } from "@kubernetes/client-node";
import { List } from "@raycast/api";
import { Toggle, useToggle } from "../hooks/useToggle";
import { getDarkColor, getLightColor } from "../utils/color";
import ResourceAction from "./resource-action";
import ResourceDetail from "./resource-detail";

export default function ResourceItem<T extends KubernetesObject>(props: {
  apiVersion: string;
  kind: string;
  resource: T;
  detailView: Toggle;
  renderFields: (resource: T) => string[];
}) {
  const { apiVersion, kind, resource, detailView, renderFields } = props;

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
          detailView={detailView}
          managedFields={managedFields}
          lastAppliedConfiguration={lastAppliedConfiguration}
        />
      }
      accessories={
        detailView.show
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
