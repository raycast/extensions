import { Action, ActionPanel, Form, Toast, open, showToast } from "@raycast/api";
import { getDashboardUrl } from "./dashboard-url";
import { setToastFailure, startDaytonaAnimatedToast } from "./daytona-toast";

type FormValues = {
  name?: string;
  image: string;
  cpu?: string;
  memory?: string;
  disk?: string;
  entrypoint?: string;
};

export default function CreateSnapshotCommand() {
  function generateSnapshotName(): string {
    const randomSuffix = Math.random().toString(36).slice(2, 8);
    return `snapshot-${Date.now()}-${randomSuffix}`;
  }

  function parseOptionalInteger(value: string | undefined, label: string): number | undefined {
    const trimmed = value?.trim();
    if (!trimmed) return undefined;

    const parsed = Number(trimmed);
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new Error(`${label} must be an integer >= 1`);
    }

    return parsed;
  }

  function parseOptionalEntrypoint(value: string | undefined): string[] | undefined {
    const trimmed = value?.trim();
    if (!trimmed) return undefined;

    const parts = trimmed
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    return parts.length > 0 ? parts : undefined;
  }

  async function handleSubmit(values: FormValues) {
    const imageName = values.image.trim();

    if (!imageName) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Base image is required",
      });
      return;
    }

    const snapshotName = values.name?.trim() || generateSnapshotName();
    const { preferences, daytona, toast } = await startDaytonaAnimatedToast("Creating snapshot");

    try {
      const cpu = parseOptionalInteger(values.cpu, "CPU");
      const memory = parseOptionalInteger(values.memory, "Memory");
      const disk = parseOptionalInteger(values.disk, "Disk");

      const snapshot = await daytona.snapshot.create({
        name: snapshotName,
        image: imageName,
        resources: cpu || memory || disk ? { cpu, memory, disk } : undefined,
        entrypoint: parseOptionalEntrypoint(values.entrypoint),
      });

      toast.style = Toast.Style.Success;
      toast.title = "Snapshot created";
      toast.message = `${snapshot.name} (${snapshot.id})`;
      toast.primaryAction = {
        title: "Open in Dashboard",
        onAction: () => open(getDashboardUrl(preferences.apiUrl, `snapshots?snapshotId=${snapshot.id}`)),
      };
    } catch (error) {
      setToastFailure(toast, "Failed to create snapshot", error);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Snapshot" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="my-awesome-snapshot" />
      <Form.TextField id="image" title="Base Image" defaultValue="daytonaio/sandbox:0.6.0" />
      <Form.Separator />
      <Form.TextField id="cpu" title="CPU Cores" placeholder="Integer value (e.g. 2)" />
      <Form.TextField id="memory" title="Memory (GiB)" placeholder="Integer value (e.g. 4)" />
      <Form.TextField id="disk" title="Disk (GiB)" placeholder="Integer value (e.g. 8)" />
      <Form.Separator />
      <Form.TextField
        id="entrypoint"
        title="Entrypoint"
        placeholder="Comma-separated args, e.g. /bin/bash,-lc,echo hello"
      />
    </Form>
  );
}
