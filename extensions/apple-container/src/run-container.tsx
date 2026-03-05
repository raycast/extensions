import { Form, ActionPanel, Action, showToast, Toast, Icon, popToRoot } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { useState, useMemo } from "react";
import { CONTAINER_BIN, containerExec, parseNetworkList } from "./lib/container";

interface RunFormValues {
  image: string;
  name: string;
  command: string;
  network: string;
  ports: string;
  env: string;
  cpus: string;
  memory: string;
  volumes: string;
  detach: boolean;
  autoRemove: boolean;
  rosetta: boolean;
  readOnly: boolean;
  init: boolean;
  ssh: boolean;
}

export default function RunContainer() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: networkData } = useExec(CONTAINER_BIN, ["network", "list", "--format", "json"], {
    keepPreviousData: true,
  });
  const networks = useMemo(() => parseNetworkList(networkData || "").filter((n) => !n.isBuiltin), [networkData]);

  async function handleSubmit(values: RunFormValues) {
    const image = values.image.trim();
    if (!image) {
      await showToast(Toast.Style.Failure, "Image is required");
      return;
    }

    const args: string[] = ["run"];

    if (values.detach) args.push("-d");
    if (values.autoRemove) args.push("--rm");
    if (values.rosetta) args.push("--rosetta");
    if (values.readOnly) args.push("--read-only");
    if (values.init) args.push("--init");
    if (values.ssh) args.push("--ssh");

    if (values.name.trim()) args.push("--name", values.name.trim());
    if (values.network && values.network !== "__none__") args.push("--network", values.network);
    if (values.cpus.trim()) args.push("--cpus", values.cpus.trim());
    if (values.memory.trim()) args.push("--memory", values.memory.trim());

    if (values.ports.trim()) {
      for (const mapping of values.ports.split(",")) {
        const trimmed = mapping.trim();
        if (trimmed) args.push("-p", trimmed);
      }
    }

    if (values.env.trim()) {
      for (const line of values.env.split("\n")) {
        const trimmed = line.trim();
        if (trimmed) args.push("-e", trimmed);
      }
    }

    if (values.volumes.trim()) {
      for (const vol of values.volumes.split("\n")) {
        const trimmed = vol.trim();
        if (trimmed) args.push("-v", trimmed);
      }
    }

    args.push(image);

    if (values.command.trim()) {
      args.push(...values.command.trim().split(/\s+/));
    }

    setIsSubmitting(true);
    const toast = await showToast(Toast.Style.Animated, `Running ${image}...`);
    try {
      await containerExec(args, { timeout: 120000 });
      toast.style = Toast.Style.Success;
      toast.title = `Started ${values.name.trim() || image}`;
      popToRoot();
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to run container";
      toast.message = String(e);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run Container" icon={Icon.Play} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="image" title="Image" placeholder="e.g. postgres:15, nginx:latest" autoFocus />
      <Form.TextField id="name" title="Name" placeholder="Optional container name" />
      <Form.TextField id="command" title="Command" placeholder="Override entrypoint command" />
      <Form.Separator />
      <Form.Dropdown id="network" title="Network" defaultValue="__none__">
        <Form.Dropdown.Item value="__none__" title="Default" />
        {networks.map((n) => (
          <Form.Dropdown.Item key={n.id} value={n.id} title={n.id} />
        ))}
      </Form.Dropdown>
      <Form.TextField id="ports" title="Ports" placeholder="8080:80, 5432:5432" />
      <Form.TextArea id="env" title="Environment" placeholder={"KEY=VALUE (one per line)"} />
      <Form.TextField id="cpus" title="CPUs" placeholder="e.g. 2" />
      <Form.TextField id="memory" title="Memory" placeholder="e.g. 512m, 2g" />
      <Form.TextArea id="volumes" title="Volumes" placeholder={"/host/path:/container/path (one per line)"} />
      <Form.Separator />
      <Form.Checkbox id="detach" label="Run in Background" defaultValue={true} />
      <Form.Checkbox id="autoRemove" label="Auto-remove When Stopped" defaultValue={false} />
      <Form.Checkbox id="rosetta" label="Enable Rosetta" defaultValue={false} />
      <Form.Checkbox id="readOnly" label="Read-only Filesystem" defaultValue={false} />
      <Form.Checkbox id="init" label="Use Init Process" defaultValue={false} />
      <Form.Checkbox id="ssh" label="SSH Agent Forwarding" defaultValue={false} />
    </Form>
  );
}
