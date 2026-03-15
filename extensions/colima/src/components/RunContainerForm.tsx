import { Action, ActionPanel, Form, Icon, Toast, showToast } from "@raycast/api";
import { useDockerNetworks } from "../hooks/useDockerNetworks";
import { dockerRun, execCommand } from "../utils/cli";
import { buildDockerRunArgs, DockerRunFormValues, parseRawCommand } from "../utils/docker-run-builder";

interface RunContainerFormProps {
  initialImage?: string;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unknown error";
}

async function handleSubmit(values: DockerRunFormValues) {
  const rawCommand = values.rawCommand?.trim() ?? "";
  const image = values.image?.trim() ?? "";

  if (!rawCommand && !image) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Please provide a raw command or an image name",
    });
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Running container...",
  });

  try {
    let output = "";

    if (rawCommand) {
      const parsedRawCommand = parseRawCommand(rawCommand);
      output = await execCommand("sh", ["-c", `docker run ${parsedRawCommand}`], { timeout: 60_000, shell: false });
    } else {
      const { args } = buildDockerRunArgs(values);
      output = await dockerRun(args.slice(1));
    }

    const containerId = output.trim();
    toast.style = Toast.Style.Success;
    toast.title = "Container started";
    if (containerId) {
      toast.message = containerId;
    }
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to run container";
    toast.message = getErrorMessage(error);
  }
}

export function RunContainerForm({ initialImage }: RunContainerFormProps) {
  const { data: networks, isLoading: networksLoading } = useDockerNetworks();

  return (
    <Form
      navigationTitle="Run Docker Container"
      isLoading={networksLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run Container" icon={Icon.Play} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Paste a raw docker run command, or fill in the structured fields below." />
      <Form.Separator />
      <Form.TextArea
        id="rawCommand"
        title="Raw Command"
        placeholder="docker run -d -p 8080:80 nginx"
        info="If provided, all other fields are ignored"
      />
      <Form.Separator />
      <Form.TextField
        id="image"
        title="Image"
        placeholder="e.g. nginx:latest, postgres:16"
        defaultValue={initialImage}
      />
      <Form.TextField id="containerName" title="Container Name" placeholder="my-container (optional)" />
      <Form.TextField id="ports" title="Ports" placeholder="8080:80, 5432:5432" info="Comma-separated port mappings" />
      <Form.TextArea
        id="envVars"
        title="Environment Variables"
        placeholder="KEY=VALUE\nDB_HOST=localhost"
        info="One per line in KEY=VALUE format"
      />
      <Form.TextArea
        id="volumes"
        title="Volumes"
        placeholder="/host/path:/container/path\n/data:/data:ro"
        info="One per line in host:container[:options] format"
      />
      <Form.Dropdown id="network" title="Network" defaultValue="default">
        <Form.Dropdown.Item title="Default (bridge)" value="default" />
        {networks.map((network) => (
          <Form.Dropdown.Item key={network.id || network.name} title={network.name} value={network.name} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="restartPolicy" title="Restart Policy" defaultValue="no">
        <Form.Dropdown.Item title="no" value="no" />
        <Form.Dropdown.Item title="always" value="always" />
        <Form.Dropdown.Item title="unless-stopped" value="unless-stopped" />
        <Form.Dropdown.Item title="on-failure" value="on-failure" />
      </Form.Dropdown>
      <Form.Checkbox id="detached" title="Options" label="Run in detached mode (-d)" defaultValue={true} />
      <Form.TextField id="additionalFlags" title="Additional Flags" placeholder="--memory 512m --cpus 2" />
    </Form>
  );
}
