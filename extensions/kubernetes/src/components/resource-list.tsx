import { KubernetesObject } from "@kubernetes/client-node";
import { List } from "@raycast/api";
import { useEffect, useState } from "react";
import useKubernetesResources from "../hooks/useKubernetesResources";
import { useToggle } from "../hooks/useToggle";
import { useKubernetesContext } from "../states/context";
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

      {resources.map((resource) => (
        <ResourceItem
          key={resource.metadata?.uid}
          apiVersion={apiVersion}
          kind={kind}
          resource={resource}
          detailView={detailView}
          renderFields={renderFields}
        />
      ))}
    </List>
  );
}
