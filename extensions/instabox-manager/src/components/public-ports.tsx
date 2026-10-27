import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  confirmAlert,
  Form,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise, useForm } from "@raycast/utils";
import { listPorts, publishPort, unpublishPort } from "../services/ports";
import { Machine, PublicPort } from "../types";
import { errorToast, showError } from "../utils/errors";
import { formatRelative } from "../utils/format";

const RESERVED_PORTS = new Set([5901, 6768]);

export function PublicPortsList({ machine }: { machine: Machine }) {
  const { data, isLoading, revalidate, error } = useCachedPromise(listPorts, [machine.id], {
    onError: errorToast("Could not load public ports"),
  });
  const ports = data?.ports ?? [];

  const publishAction = (
    <Action.Push
      title="Publish Port"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<PublishPortForm machine={machine} onPublished={revalidate} />}
    />
  );

  const refreshAction = (
    <Action
      title="Refresh"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={revalidate}
    />
  );

  async function unpublish(port: PublicPort) {
    const confirmed = await confirmAlert({
      title: `Remove the public URL of port ${port.port}?`,
      message: "Its URL stops working and open connections close.",
      primaryAction: { title: "Remove URL", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    const toast = await showToast({ style: Toast.Style.Animated, title: `Removing port ${port.port}…` });
    try {
      await unpublishPort(machine.id, port.port);
      toast.style = Toast.Style.Success;
      toast.title = `Removed port ${port.port}`;
      revalidate();
    } catch (error) {
      await showError(error, { toast });
    }
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Public Ports of ${machine.name}`}
      searchBarPlaceholder="Search ports..."
    >
      {error && !data ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Could not load public ports"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : data && !data.enabled ? (
        <List.EmptyView
          icon={Icon.Globe}
          title="Public ports are not available"
          description="This InstaBox server has no public ports configured."
          actions={<ActionPanel>{refreshAction}</ActionPanel>}
        />
      ) : (
        !isLoading && (
          <List.EmptyView
            icon={Icon.Globe}
            title="No public ports"
            description="Give a web server in this machine an HTTPS URL."
            actions={
              <ActionPanel>
                {publishAction}
                {refreshAction}
              </ActionPanel>
            }
          />
        )
      )}
      {ports.map((port) => (
        <List.Item
          key={port.id}
          icon={Icon.Globe}
          title={port.name}
          subtitle={port.url}
          keywords={[String(port.port)]}
          accessories={[
            { tag: String(port.port), tooltip: "Port" },
            { text: formatRelative(port.createdAt), tooltip: "Published" },
          ]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={port.url} />
              <Action.CopyToClipboard title="Copy URL" content={port.url} />
              {publishAction}
              {refreshAction}
              <Action
                title="Remove Public URL"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
                onAction={() => unpublish(port)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function PublishPortForm({ machine, onPublished }: { machine: Machine; onPublished: () => void }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ port: string; name: string }>({
    validation: {
      port: (value) => {
        const port = Number(value);
        if (!value || !Number.isInteger(port) || port < 1024 || port > 65535) return "Enter a port from 1024 to 65535";
        if (RESERVED_PORTS.has(port)) return "This port is reserved by InstaBox";
      },
      name: (value) => (value && value.trim().length > 100 ? "Use at most 100 characters" : undefined),
    },
    async onSubmit(values) {
      const toast = await showToast({ style: Toast.Style.Animated, title: `Publishing port ${values.port}…` });
      try {
        const port = await publishPort(machine.id, Number(values.port), values.name.trim() || undefined);
        if (port.url) await Clipboard.copy(port.url);
        toast.style = Toast.Style.Success;
        toast.title = `Published port ${port.port}`;
        toast.message = port.url ? "Copied its URL" : undefined;
        onPublished();
        pop();
      } catch (error) {
        await showError(error, { toast, title: "Could not publish the port" });
      }
    },
  });

  return (
    <Form
      navigationTitle={`Publish Port on ${machine.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Publish Port" icon={Icon.Globe} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="⚠️ Public"
        text="Anyone with the URL can reach the whole service on this port while the machine runs. Publishing does not start a server."
      />
      <Form.TextField {...itemProps.port} title="Port" placeholder="3000" />
      <Form.TextField {...itemProps.name} title="Name" placeholder="Web App" />
    </Form>
  );
}
