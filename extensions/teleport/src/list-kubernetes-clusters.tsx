import { Action, ActionPanel, getPreferenceValues, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  connectToKubernetesCluster,
  getKubernetesClustersList,
  getKubernetesClustersPodsList,
  getKubernetesPodCommand,
} from "./utils";
import { runAppleScript } from "run-applescript";
import { useMemo } from "react";

async function open(name: string, namespace: string) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Connecting...",
  });

  const prefs = getPreferenceValues();
  const terminal = prefs.terminal.name;

  try {
    const command = getKubernetesPodCommand(name, namespace);

    await runAppleScript(`
            tell application "Finder" to activate
            tell application "${terminal}" to activate
            tell application "System Events" to tell process "${terminal}" to keystroke "t" using command down
            tell application "System Events" to tell process "${terminal}"
                delay 0.5
                keystroke "${command}"
                delay 0.5
                key code 36
            end tell  
        `);

    toast.style = Toast.Style.Success;
    toast.title = "Success !";
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failure !";
  }
}

function ListPods(props: { name: string }) {
  const { data, isLoading } = useCachedPromise(
    async (name) => {
      await connectToKubernetesCluster(name);
      return await getKubernetesClustersPodsList();
    },
    [props.name]
  );

  return (
    <List isLoading={isLoading}>
      {data?.map((item: { metadata: { name: string; namespace: string } }, index: number) => {
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
  const { data, isLoading } = useCachedPromise(getKubernetesClustersList);

  return (
    <List isLoading={isLoading}>
      {data?.map((item: { kube_cluster_name: string }, index: number) => {
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
