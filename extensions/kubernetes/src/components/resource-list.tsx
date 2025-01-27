import { KubernetesObject } from "@kubernetes/client-node";
import { List } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import useKubernetesResources from "../hooks/useKubernetesResources";
import { useToggle } from "../hooks/useToggle";
import { useKubernetesContext } from "../states/context";
import { useKubernetesNamespace } from "../states/namespace";
import NamespaceDropdown from "./namespace-dropdown";
import ResourceItem from "./resource-item";

export function ResourceList<T extends KubernetesObject>(props: {
  apiVersion: string;
  kind: string;
  namespaced: boolean;
  matchResource: (resource: T, searchText: string) => boolean;
  renderFields: (resource: T) => string[];
}) {
  const { apiVersion, kind, namespaced, matchResource, renderFields } = props;

  const { currentContext } = useKubernetesContext();
  const { currentNamespace } = useKubernetesNamespace();

  const detailView = useToggle("Detail View", false);
  const [searchText, setSearchText] = useState("");
  const [resources, setResources] = useState<T[]>([]);

  const { isLoading, data } = useKubernetesResources<T>(apiVersion, kind);

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

  const renderResourceItems = useCallback(
    (resources: T[]) => {
      return resources.map((resource) => (
        <ResourceItem
          key={resource.metadata?.uid}
          apiVersion={apiVersion}
          kind={kind}
          resource={resource}
          detailView={detailView}
          renderFields={renderFields}
        />
      ));
    },
    [apiVersion, kind, detailView, renderFields],
  );

  return (
    <List
      navigationTitle={`${kind} (${resources.length}) 🐳 Context: ${currentContext}`}
      isShowingDetail={detailView.show}
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
