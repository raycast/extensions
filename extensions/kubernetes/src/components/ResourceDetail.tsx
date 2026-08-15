import { KubernetesObject } from "@kubernetes/client-node";
import { List } from "@raycast/api";
import * as yaml from "js-yaml";
import { Toggle } from "../hooks/useToggle";

export default function ResourceDetail<T extends KubernetesObject>(props: {
  apiVersion: string;
  kind: string;
  resource: T;
  managedFields: Toggle;
  lastAppliedConfiguration: Toggle;
}) {
  const { apiVersion, kind, resource, managedFields, lastAppliedConfiguration } = props;

  const hideManagedFields = (resource: T) => {
    if (managedFields.show) {
      return resource;
    }
    return {
      ...resource,
      metadata: {
        ...resource.metadata,
        managedFields: undefined,
      },
    };
  };

  const hideLastAppliedConfiguration = (resource: T) => {
    if (lastAppliedConfiguration.show) {
      return resource;
    }

    return {
      ...resource,
      metadata: {
        ...resource.metadata,
        annotations: {
          ...resource.metadata?.annotations,
          "kubectl.kubernetes.io/last-applied-configuration": undefined,
        },
      },
    };
  };

  const wrapCodeBlock = (content: string) => {
    return "```yaml\n" + content + "\n```";
  };

  return (
    <List.Item.Detail
      markdown={wrapCodeBlock(
        yaml.dump({
          apiVersion,
          kind,
          ...hideManagedFields(hideLastAppliedConfiguration(resource)),
        }),
      )}
    />
  );
}
