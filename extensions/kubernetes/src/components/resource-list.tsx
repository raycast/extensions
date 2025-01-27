import { ApiType, KubernetesObject } from "@kubernetes/client-node";
import { List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { ApiConstructor, useKubernetesContext } from "../states/context";
import { useKubernetesNamespace } from "../states/namespace";
import { getDarkColor, getLightColor } from "../utils/color";
import NamespaceDropdown from "./namespace-dropdown";
import ResourceAction from "./resource-action";
import ResourceDetail from "./resource-detail";

export function ResourceList<T extends KubernetesObject, U extends ApiType>(props: {
  apiVersion: string;
  kind: string;
  namespaced: boolean;
  apiClientType: ApiConstructor<U>;
  listResources: (apiType: U, namespace: string) => Promise<T[]>;
  matchResource: (resource: T, searchText: string) => boolean;
  renderFields: (resource: T) => string[];
}) {
  const { apiVersion, kind, namespaced, apiClientType, listResources, matchResource, renderFields } = props;

  const { currentContext, getApiClient } = useKubernetesContext();
  const { currentNamespace } = useKubernetesNamespace();

  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const [showManagedFields, setShowManagedFields] = useState(false);
  const [showLastAppliedConfiguration, setShowLastAppliedConfiguration] = useState(false);

  const [searchText, setSearchText] = useState("");
  const [resources, setResources] = useState<T[]>([]);

  const { isLoading, data } = usePromise(
    async (namespace: string) => {
      return await listResources(getApiClient(apiClientType), namespace);
    },
    [currentNamespace],
    { onData: setResources },
  );

  useEffect(() => {
    if (!data) {
      return;
    }
    setResources(data.filter((resource) => !searchText || matchResource(resource, searchText.toLowerCase())));
  }, [data, searchText]);

  return (
    <List
      navigationTitle={`${kind} (${resources.length ?? 0}) 🐳 Context: ${currentContext}`}
      isShowingDetail={isShowingDetail}
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarAccessory={namespaced ? <NamespaceDropdown /> : undefined}
    >
      <List.EmptyView title={isLoading ? "Loading ..." : "No results found"} />

      {resources.map((resource) => (
        <List.Item
          key={resource.metadata?.uid}
          title={resource.metadata?.name ?? ""}
          detail={
            <ResourceDetail
              apiVersion={apiVersion}
              kind={kind}
              resource={resource}
              showManagedFields={showManagedFields}
              showLastAppliedConfiguration={showLastAppliedConfiguration}
            />
          }
          actions={
            <ResourceAction
              resource={resource}
              isShowingDetail={isShowingDetail}
              setIsShowingDetail={setIsShowingDetail}
              showManagedFields={showManagedFields}
              setShowManagedFields={setShowManagedFields}
              showLastAppliedConfiguration={showLastAppliedConfiguration}
              setShowLastAppliedConfiguration={setShowLastAppliedConfiguration}
            />
          }
          accessories={
            isShowingDetail
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
      ))}
    </List>
  );
}
