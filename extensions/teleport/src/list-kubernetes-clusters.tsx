import { Action, ActionPanel, Color, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import {
  appleScriptTerminalCommand,
  capitalize,
  kubernetesClustersList,
  kubernetesClustersPodsList,
  kubernetesPodCommand,
} from "./utils";
import { runAppleScript } from "run-applescript";
import { useMemo } from "react";

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

interface Item {
  metadata: { name: string; namespace: string; creationTimestamp: string };
}

function ListPods(props: { name: string }) {
  const { data, isLoading } = kubernetesClustersPodsList(props.name);
  const results = useMemo(() => JSON.parse(data || "{}").items || [], [data]).reduce((acc: any, item: Item) => {
    const namespace = item.metadata.namespace;
    acc[namespace] ? acc[namespace].push(item) : (acc[namespace] = [item]);

    return acc;
  }, {});

  return (
    <List isLoading={isLoading}>
      {Object.entries(results)
        .sort(([namespaceA]: [string, any], [namespaceB]: [string, any]) => namespaceA.localeCompare(namespaceB))
        .map(([namespace, group]: [string, any]) => {
          return (
            <List.Section title={capitalize(namespace)}>
              {group
                .sort((itemA: Item, itemB: Item) => itemA.metadata.name.localeCompare(itemB.metadata.name))
                .map((item: Item, index: number) => {
                  const name = item.metadata.name;
                  return (
                    <List.Item
                      key={name + index}
                      title={name}
                      subtitle={new Date(item.metadata.creationTimestamp).toLocaleString()}
                      icon={{ source: Icon.Dot, tintColor: Color.Green }}
                      accessories={[{ text: { value: capitalize(namespace) } }]}
                      actions={
                        <ActionPanel>
                          <Action title="Open" icon={Icon.Terminal} onAction={() => open(name, namespace)} />
                          <Action.CopyToClipboard content={name} />
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
  const results = useMemo(() => JSON.parse(data || "[]") || [], [data]);

  return (
    <List isLoading={isLoading}>
      {results.map((item: { kube_cluster_name: string }, index: number) => {
        const name = item.kube_cluster_name;

        return (
          <List.Item
            key={name + index}
            title={name}
            icon={{ source: Icon.Dot, tintColor: Color.Green }}
            actions={
              <ActionPanel>
                <Action.Push title="List Pods" icon={Icon.List} target={<ListPods name={name} />} />
                <Action.CopyToClipboard content={name} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
