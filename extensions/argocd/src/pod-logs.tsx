import { Action, ActionPanel, Detail, Icon, List, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo } from "react";
import { getPodLogs, getResourceManifest } from "./argocd";

const TAIL_LINES = 500;

interface ContainerInfo {
  name: string;
  image?: string;
  init?: boolean;
}

function parseContainers(manifest: string): ContainerInfo[] {
  try {
    const obj = JSON.parse(manifest) as {
      spec?: {
        containers?: Array<{ name: string; image?: string }>;
        initContainers?: Array<{ name: string; image?: string }>;
      };
    };
    const out: ContainerInfo[] = [];
    for (const c of obj.spec?.initContainers ?? []) out.push({ name: c.name, image: c.image, init: true });
    for (const c of obj.spec?.containers ?? []) out.push({ name: c.name, image: c.image });
    return out;
  } catch {
    return [];
  }
}

export function PodContainerPicker({
  appName,
  podName,
  namespace,
}: {
  appName: string;
  podName: string;
  namespace: string;
}) {
  const { data, isLoading, error } = usePromise(
    async (n: string, p: string, ns: string) =>
      getResourceManifest(n, { kind: "Pod", version: "v1", name: p, namespace: ns }),
    [appName, podName, namespace],
    {
      onError: (err) => {
        showToast({ style: Toast.Style.Failure, title: "Failed to load pod spec", message: err.message });
      },
    },
  );

  const containers = useMemo(() => (data ? parseContainers(data) : []), [data]);

  if (error) {
    return (
      <List>
        <List.EmptyView icon={Icon.Warning} title="Failed to load pod spec" description={error.message} />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} navigationTitle={`${podName} · Containers`} searchBarPlaceholder="Filter containers...">
      {containers.length === 0 && !isLoading ? (
        <List.EmptyView icon={Icon.Box} title="No containers" description="This pod has no containers." />
      ) : (
        <List.Section title="Containers" subtitle={`${containers.length}`}>
          {containers.map((c) => (
            <List.Item
              key={`${c.init ? "init:" : ""}${c.name}`}
              icon={c.init ? Icon.Hourglass : Icon.Box}
              title={c.name}
              subtitle={c.init ? "init" : undefined}
              accessories={c.image ? [{ tag: c.image }] : undefined}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Logs"
                    icon={Icon.Text}
                    target={<PodLogs appName={appName} podName={podName} namespace={namespace} container={c.name} />}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

export function PodLogs({
  appName,
  podName,
  namespace,
  container,
}: {
  appName: string;
  podName: string;
  namespace: string;
  container: string;
}) {
  const { data, isLoading, error, revalidate } = usePromise(
    async (n: string, p: string, ns: string, c: string) =>
      getPodLogs(n, { podName: p, namespace: ns, container: c, tailLines: TAIL_LINES }),
    [appName, podName, namespace, container],
    {
      onError: (err) => {
        showToast({ style: Toast.Style.Failure, title: "Failed to fetch logs", message: err.message });
      },
    },
  );

  const title = `${podName} · ${container}`;
  const reversed = useMemo(() => (data ? data.split("\n").reverse().join("\n") : ""), [data]);
  const body = error
    ? `# Failed to load logs\n\n\`\`\`\n${error.message}\n\`\`\``
    : reversed
      ? `_Newest first · last ${TAIL_LINES} lines_\n\n\`\`\`json\n${reversed}\n\`\`\``
      : isLoading
        ? ""
        : "_No logs available._";

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={title}
      markdown={body}
      actions={
        <ActionPanel>
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
          {data ? <Action.CopyToClipboard title="Copy Logs" content={data} /> : null}
        </ActionPanel>
      }
    />
  );
}
