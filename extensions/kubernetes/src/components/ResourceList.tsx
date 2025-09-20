import { KubernetesObject } from "@kubernetes/client-node";
import { List } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import useKubernetesResources from "../hooks/useKubernetesResources";
import { useToggle } from "../hooks/useToggle";
import { useKubernetesContext } from "../states/context";
import { useKubernetesNamespace } from "../states/namespace";
import NamespaceDropdown from "./NamespaceDropdown";
import { RelatedResource } from "./RelatedResourceAction";
import ResourceItem from "./ResourceItem";

export function ResourceList<T extends KubernetesObject>(props: {
  apiVersion: string;
  kind: string;
  namespaced: boolean;
  matchResource: (resource: T, searchText: string) => boolean;
  renderFields: (resource: T) => string[];
  namespace?: string;
  labelSelector?: string;
  relatedResource?: RelatedResource<T>;
}) {
  const { apiVersion, kind, namespaced, matchResource, renderFields, namespace, labelSelector, relatedResource } =
    props;

  const { currentContext } = useKubernetesContext();
  const { currentNamespace } = useKubernetesNamespace();

  const yamlView = useToggle("YAML", false);
  const [searchText, setSearchText] = useState("");
  const [resources, setResources] = useState<T[]>([]);

  const { isLoading, data } = useKubernetesResources<T>(apiVersion, kind, namespace, labelSelector);

  useEffect(() => {
    if (!data) {
      return;
    }
    setResources(data.filter((resource) => !searchText || matchResource(resource, searchText.toLowerCase())));
  }, [data, searchText]);

  const groupedResources = useMemo(() => {
    return resources.reduce((map, resource) => {
      const namespace = resource.metadata?.namespace ?? "default";
      if (!map.has(namespace)) {
        map.set(namespace, []);
      }
      map.get(namespace)!.push(resource);
      return map;
    }, new Map<string, T[]>());
  }, [resources]);

  const renderResourceItems = (resources: T[]) =>
    resources.map((resource) => (
      <ResourceItem
        key={resource.metadata?.uid}
        apiVersion={apiVersion}
        kind={kind}
        resource={resource}
        yamlView={yamlView}
        renderFields={renderFields}
        relatedResource={relatedResource}
      />
    ));

  const navigationTitle = useMemo(() => {
    const label = labelSelector ? `<${labelSelector}>` : "";
    return `${kind}${label}(${resources.length}) 🐳 Context: ${currentContext}`;
  }, [kind, labelSelector, resources, currentContext]);

  return (
    <List
      navigationTitle={navigationTitle}
      isShowingDetail={yamlView.show}
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarAccessory={namespaced ? <NamespaceDropdown /> : undefined}
    >
      <List.EmptyView title={isLoading ? "Loading ..." : "No results found"} />

      {currentNamespace === ""
        ? [...groupedResources.entries()].map(([namespace, resources]) => (
            <List.Section key={namespace} title={namespace}>
              {renderResourceItems(resources)}
            </List.Section>
          ))
        : renderResourceItems(resources)}
    </List>
  );
}
