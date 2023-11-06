import { Action, ActionPanel, getPreferenceValues, List, showToast, Toast } from "@raycast/api";
import {
  appleScriptTerminalCommand,
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

function ListPods(props: { name: string }) {
  const { data, isLoading } = kubernetesClustersPodsList(props.name);
  const results = useMemo(() => JSON.parse(data || "{}").items || [], [data]);

  return (
    <List isLoading={isLoading}>
      {results.map((item: { metadata: { name: string; namespace: string } }, index: number) => {
        const name = item.metadata.name;
        const namespace = item.metadata.namespace;

        return (
          <List.Item
            key={name + index}
            title={name}
            subtitle={namespace}
            actions={
              <ActionPanel>
                <Action title="Open" onAction={() => open(name, namespace)} />
                <Action.CopyToClipboard content={name} />
              </ActionPanel>
            }
          />
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
            actions={
              <ActionPanel>
                <Action.Push title="List Pods" target={<ListPods name={name} />} />
                <Action.CopyToClipboard content={name} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
