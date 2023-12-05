import { Action, ActionPanel, Color, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import {
  appleScriptTerminalCommand,
  capitalize,
  kubernetesClustersList,
  kubernetesClustersPodsList,
  kubernetesPodCommand,
} from "./utils";
import { runAppleScript } from "run-applescript";
import { useMemo, useState } from "react";
import { useFavorite } from "./hooks/use-favorite";

async function open(name: string, namespace: string) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Connecting...",
  });

  const prefs = getPreferenceValues();

  try {
    await runAppleScript(appleScriptTerminalCommand(prefs.terminal.name, kubernetesPodCommand(name, namespace)));
    toast.style = Toast.Style.Success;
    toast.title = "Success !";
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failure !";
  }
}

interface Pod {
  metadata: { name: string; namespace: string; creationTimestamp: string };
}

interface Cluster {
  kube_cluster_name: string;
}

function ListPods(props: { name: string }) {
  const { data, isLoading } = kubernetesClustersPodsList(props.name);
  const [searchText, setSearchText] = useState("");
  const { list, toggleFavorite } = useFavorite<string>("kubernetes-pods");
  const results = useMemo(() => JSON.parse(data || "{}").items || [], [data]).reduce((acc: any, item: Pod) => {
    if (searchText.length > 0 && !item.metadata.name.toLowerCase().includes(searchText.toLowerCase())) {
      return acc;
    }

    if (list.has(item.metadata.name)) {
      acc["favorites"] ? acc["favorites"].push(item) : (acc["favorites"] = [item]);
      return acc;
    }

    const namespace = item.metadata.namespace;
    acc[namespace] ? acc[namespace].push(item) : (acc[namespace] = [item]);

    return acc;
  }, {});

  return (
    <List isLoading={isLoading} filtering={false} onSearchTextChange={setSearchText}>
      {Object.entries(results)
        .sort(([namespaceA]: [string, any], [namespaceB]: [string, any]) => {
          if (namespaceA === "favorites") {
            return -1;
          }

          if (namespaceB === "favorites") {
            return 1;
          }

          return namespaceA.localeCompare(namespaceB);
        })
        .map(([namespace, group]: [string, any]) => {
          return (
            <List.Section title={capitalize(namespace)} key={namespace}>
              {group
                .sort((itemA: Pod, itemB: Pod) => itemA.metadata.name.localeCompare(itemB.metadata.name))
                .map((item: Pod, index: number) => {
                  const name = item.metadata.name;
                  const namespace = item.metadata.namespace;
                  return (
                    <List.Item
                      key={name + index}
                      title={name}
                      icon={{ source: Icon.Dot, tintColor: Color.Green }}
                      accessories={[
                        {
                          icon: list.has(name)
                            ? {
                                source: Icon.Star,
                                tintColor: Color.Yellow,
                              }
                            : undefined,
                        },
                        { tag: { value: new Date(item.metadata.creationTimestamp) }, icon: { source: Icon.Clock } },
                        { tag: { value: capitalize(namespace) } },
                      ]}
                      actions={
                        <ActionPanel>
                          <Action title="Open" icon={Icon.Terminal} onAction={() => open(name, namespace)} />
                          <Action
                            title={list.has(name) ? "Unfavorite" : "Favorite"}
                            shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                            icon={Icon.Star}
                            onAction={() => toggleFavorite(name)}
                          />
                          <Action.CopyToClipboard content={name} shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} />
                        </ActionPanel>
                      }
                    />
                  );
                })}
            </List.Section>
          );
        })}
    </List>
  );
}

export default function Command() {
  const { data, isLoading } = kubernetesClustersList();
  const [searchText, setSearchText] = useState("");
  const { list, toggleFavorite } = useFavorite<string>("kubernetes-clusters");
  let results = useMemo(() => JSON.parse(data || "[]") || [], [data]);

  if (searchText.length > 0) {
    results = results.filter((item: Cluster) =>
      item.kube_cluster_name.toLowerCase().includes(searchText.toLowerCase())
    );
  }

  return (
    <List isLoading={isLoading} filtering={false} onSearchTextChange={setSearchText}>
      {results
        .sort((itemA: Cluster, itemB: Cluster) => {
          if (list.has(itemA.kube_cluster_name) && list.has(itemB.kube_cluster_name)) {
            return itemA.kube_cluster_name.localeCompare(itemB.kube_cluster_name);
          }

          if (list.has(itemA.kube_cluster_name)) {
            return -1;
          }

          if (list.has(itemB.kube_cluster_name)) {
            return 1;
          }

          return itemA.kube_cluster_name.localeCompare(itemB.kube_cluster_name);
        })
        .map((item: Cluster, index: number) => {
          const name = item.kube_cluster_name;

          return (
            <List.Item
              key={name + index}
              title={name}
              icon={{ source: Icon.Dot, tintColor: Color.Green }}
              accessories={[
                {
                  icon: list.has(name)
                    ? {
                        source: Icon.Star,
                        tintColor: Color.Yellow,
                      }
                    : undefined,
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push title="List Pods" icon={Icon.List} target={<ListPods name={name} />} />
                  <Action
                    title={list.has(name) ? "Unfavorite" : "Favorite"}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                    icon={Icon.Star}
                    onAction={() => toggleFavorite(name)}
                  />
                  <Action.CopyToClipboard content={name} shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} />
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
}
