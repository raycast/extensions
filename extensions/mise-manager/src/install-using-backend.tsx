import { Action, ActionPanel, Icon, List, Toast, showToast, Color, Form } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { formatMiseError, installTool, listBackends, MiseBackend } from "./tools/mise";

export default function InstallUsingBackendCommand() {
  const { data, isLoading, error } = usePromise(listBackends, []);
  const backends = data ?? [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter backends (e.g. cargo, npm, pip)">
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Failed to load backends"
          description={formatMiseError(error)}
        />
      ) : null}
      {backends.map((backend) => (
        <BackendItem key={backend} backend={backend} />
      ))}
    </List>
  );
}

function BackendItem({ backend }: { backend: MiseBackend }) {
  return (
    <List.Item
      title={backend}
      icon={{ source: Icon.Box, tintColor: Color.Blue }}
      accessories={[{ text: `Example: ${backend}:<tool>`, tooltip: `Usage: mise use ${backend}:<tool>` }]}
      actions={
        <ActionPanel>
          <Action.Push
            title={`Install Tool Via ${backend}…`}
            icon={Icon.Download}
            target={<InstallToolForm backend={backend} />}
          />
        </ActionPanel>
      }
    />
  );
}

function InstallToolForm({ backend }: { backend: string }) {
  async function handleSubmit(values: { name: string; version?: string }) {
    const name = values.name.trim();
    if (!name) {
      await showToast({ style: Toast.Style.Failure, title: "Tool name is required" });
      return;
    }

    // Construct spec: backend:name@version or just backend:name
    let fullSpec = `${backend}:${name}`;
    if (values.version?.trim()) {
      fullSpec += `@${values.version.trim()}`;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: `Installing ${fullSpec}` });
    try {
      await installTool(fullSpec);
      toast.style = Toast.Style.Success;
      toast.title = `Installed ${fullSpec}`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Failed to install ${fullSpec}`;
      toast.message = formatMiseError(error);
    }
  }

  return (
    <Form
      navigationTitle={`Install ${backend} Tool`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Install" onSubmit={handleSubmit} icon={Icon.Download} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Install a tool using the '${backend}' backend.`} />
      <Form.TextField id="name" title="Tool Name" placeholder="e.g. requests, react, burntsushi/ripgrep" autoFocus />
      <Form.TextField id="version" title="Version" placeholder="latest" />
    </Form>
  );
}
