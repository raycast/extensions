import { ApiType, KubernetesObject } from "@kubernetes/client-node";
import { Action, ActionPanel, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import * as yaml from "js-yaml";
import { useEffect, useState } from "react";
import { ApiConstructor, useKubernetesContext } from "../states/context";
import { useKubernetesNamespace } from "../states/namespace";
import { getDarkColor, getLightColor } from "../utils/color";
import NamespaceDropdown from "./namespace-dropdown";

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
            <ActionPanel>
              <Action title="Toggle Detail View" onAction={() => setIsShowingDetail(!isShowingDetail)} />
              <Action.CopyToClipboard
                title="Copy Name to Clipboard"
                content={resource.metadata?.name ?? ""}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              {isShowingDetail && (
                <Action
                  title="Toggle Show Managed Fields"
                  onAction={() => setShowManagedFields(!showManagedFields)}
                  shortcut={{ modifiers: ["cmd"], key: "m" }}
                />
              )}
              {isShowingDetail && (
                <Action
                  title="Toggle Show Last Applied Configuration"
                  onAction={() => setShowLastAppliedConfiguration(!showLastAppliedConfiguration)}
                  shortcut={{ modifiers: ["cmd"], key: "l" }}
                />
              )}
            </ActionPanel>
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

function ResourceDetail<T extends KubernetesObject>(props: {
  apiVersion: string;
  kind: string;
  resource: T;
  showManagedFields: boolean;
  showLastAppliedConfiguration: boolean;
}) {
  const { apiVersion, kind, resource, showManagedFields, showLastAppliedConfiguration } = props;

  const hideManagedFields = (resource: T) => {
    if (showManagedFields) {
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
    if (showLastAppliedConfiguration) {
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
