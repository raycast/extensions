import { KubernetesObject } from "@kubernetes/client-node";
import { Action, Icon, showToast, Toast } from "@raycast/api";
import { ReactNode } from "react";

export type RelatedResource<T extends KubernetesObject> = {
  kind: string;
  render: (resource: T) => ReactNode;
};

export function RelatedResourceAction<T extends KubernetesObject>(props: {
  resource: T;
  relatedResource?: RelatedResource<T>;
}) {
  const { resource, relatedResource } = props;

  const renderedRelatedResource = relatedResource && relatedResource.render(resource);

  return (
    relatedResource &&
    (renderedRelatedResource ? (
      <Action.Push
        title={`Show ${relatedResource.kind}`}
        target={renderedRelatedResource}
        icon={Icon.MagnifyingGlass}
      />
    ) : (
      <Action
        title={`Show ${relatedResource.kind}`}
        icon={Icon.MagnifyingGlass}
        onAction={() =>
          showToast({
            title: `No matching ${relatedResource.kind}`,
            style: Toast.Style.Failure,
          })
        }
      />
    ))
  );
}
