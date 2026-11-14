import {
  Action,
  ActionPanel,
  Form,
  Icon,
  launchCommand,
  LaunchType,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useForm } from "@raycast/utils";
import { createSnapshot, waitForSnapshot } from "../services/snapshots";
import { Machine } from "../types";
import { showError } from "../utils/errors";
import { NAME_PATTERN } from "./create-machine-form";

interface FormValues {
  name: string;
  description: string;
  rootOnly: boolean;
}

function defaultName(machine: Machine) {
  const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
  return `${machine.name.slice(0, 63 - stamp.length - 1)}-${stamp}`;
}

export function CreateSnapshotForm({ machine }: { machine: Machine }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps, values } = useForm<FormValues>({
    initialValues: { name: defaultName(machine), description: "", rootOnly: false },
    validation: {
      name: (value) => {
        if (!value) return "Name is required";
        if (!NAME_PATTERN.test(value)) return "Use 1-63 lowercase letters, digits and dashes";
      },
    },
    async onSubmit(values) {
      const toast = await showToast({ style: Toast.Style.Animated, title: `Saving ${values.name}` });
      try {
        const snapshot = await createSnapshot(machine.id, {
          name: values.name,
          description: values.description.trim() || undefined,
          rootOnly: values.rootOnly,
        });
        pop();
        if (snapshot.status === "pending") {
          toast.message = "Uploading the copy; the machine keeps running";
          await waitForSnapshot(snapshot);
        }
        toast.style = Toast.Style.Success;
        toast.title = `Saved snapshot ${values.name}`;
        toast.message = undefined;
        toast.primaryAction = {
          title: "Manage Snapshots",
          onAction: async () => {
            try {
              await launchCommand({ name: "manage-snapshots", type: LaunchType.UserInitiated });
            } catch (error) {
              await showError(error, { title: "Could not open Manage Snapshots" });
            }
          },
        };
      } catch (error) {
        await showError(error, { toast, title: "Could not save the snapshot" });
      }
    },
  });

  return (
    <Form
      navigationTitle={`Snapshot ${machine.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Snapshot" icon={Icon.SaveDocument} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        text={
          machine.state === "running"
            ? "A running machine is saved live: its files freeze for well under a second, like after a sudden power cut. Memory and running programs are not saved."
            : "Saves the stopped machine's system files and storage."
        }
      />
      <Form.TextField {...itemProps.name} title="Name" placeholder="node-22-ready" info="Unique among your snapshots" />
      <Form.TextArea
        {...itemProps.description}
        title="Description"
        placeholder="Node 22, Claude Code and repo set up"
      />
      <Form.Checkbox
        {...itemProps.rootOnly}
        title="Contents"
        label="System files only"
        info="Skips the storage (/data). Machines created from it start with empty storage."
      />
      {!values.rootOnly && (
        <Form.Description
          title="⚠️ Secrets"
          text="Storage includes /data/home: credentials for gh, Claude, Codex, git and SSH, and any .env files. Anyone who creates a machine from this snapshot gets them too."
        />
      )}
    </Form>
  );
}
