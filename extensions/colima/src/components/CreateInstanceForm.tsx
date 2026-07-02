import { Action, ActionPanel, Form, Icon, popToRoot, showToast, Toast } from "@raycast/api";
import { colimaCreate, colimaSaveTemplateDefaults, colimaTemplateDefaults } from "../utils/cli";
import { ColimaCreateOptions, type ColimaTemplateDefaults } from "../utils/types";
import { getErrorMessage } from "../utils/getErrorMessage";
import { useEffect, useReducer, useState } from "react";

const FALLBACK_DEFAULTS: ColimaTemplateDefaults = {
  cpus: 2,
  memory: 2,
  disk: 100,
  runtime: "docker",
  vmType: "qemu",
  kubernetes: false,
};

interface CreateInstanceFormValues {
  profile: string;
  cpus: string;
  memory: string;
  disk: string;
  runtime: ColimaCreateOptions["runtime"];
  vmType: ColimaCreateOptions["vmType"];
  kubernetes: boolean;
}

async function handleSaveTemplate(formValues: CreateInstanceFormValues) {
  const cpus = Number(formValues.cpus);
  const memory = Number(formValues.memory);
  const disk = Number(formValues.disk);

  if (Number.isNaN(cpus) || Number.isNaN(memory) || Number.isNaN(disk)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "CPU, memory, and disk must be numbers",
    });
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Saving default template...",
  });

  try {
    await colimaSaveTemplateDefaults({
      cpus,
      memory,
      disk,
      runtime: formValues.runtime,
      vmType: formValues.vmType,
      kubernetes: formValues.kubernetes,
    });

    toast.style = Toast.Style.Success;
    toast.title = "Default template saved";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to save default template";
    toast.message = getErrorMessage(error);
  }
}

async function handleSubmit(values: CreateInstanceFormValues, onCreated: () => void) {
  const { profile, cpus, memory, disk, runtime, vmType, kubernetes } = values;
  const trimmedProfile = profile.trim() || "default";

  if (Number.isNaN(Number(cpus)) || Number.isNaN(Number(memory)) || Number.isNaN(Number(disk))) {
    await showToast({
      style: Toast.Style.Failure,
      title: "CPU, memory, and disk must be numbers",
    });
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Creating instance...",
  });

  try {
    await colimaCreate({
      profile: trimmedProfile,
      cpus: Number(cpus),
      memory: Number(memory),
      disk: Number(disk),
      runtime,
      vmType,
      kubernetes,
    });

    toast.style = Toast.Style.Success;
    toast.title = "Instance created";

    onCreated();
    popToRoot();
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to create instance";
    toast.message = getErrorMessage(error);
  }
}

function initialFormValues(defaults: ColimaTemplateDefaults): CreateInstanceFormValues {
  return {
    profile: "",
    cpus: String(defaults.cpus),
    memory: String(defaults.memory),
    disk: String(defaults.disk),
    runtime: defaults.runtime,
    vmType: defaults.vmType,
    kubernetes: defaults.kubernetes,
  };
}

interface CreateInstanceFormProps {
  onCreated: () => void;
}

export function CreateInstanceForm({ onCreated }: CreateInstanceFormProps) {
  const [isLoading, setIsLoading] = useState(true);

  const [formValues, setFormValues] = useReducer(
    (prev: CreateInstanceFormValues, next: Partial<CreateInstanceFormValues>) => ({
      ...prev,
      ...next,
    }),
    initialFormValues(FALLBACK_DEFAULTS),
  );

  useEffect(() => {
    async function load() {
      try {
        const result = await colimaTemplateDefaults();
        setFormValues(initialFormValues(result));
      } catch {
        // keep fallback defaults
      } finally {
        setIsLoading(false);
      }
    }
    void load();
  }, []);

  if (isLoading) {
    return <Form isLoading />;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Instance" onSubmit={() => handleSubmit(formValues, onCreated)} />
          <Action
            title="Save as Default Template"
            icon={Icon.Document}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            onAction={() => {
              void handleSaveTemplate(formValues);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="profile"
        title="Profile Name"
        value={formValues.profile}
        placeholder="e.g. default, dev, test"
        onChange={(v) => setFormValues({ profile: v })}
      />
      <Form.TextField
        id="cpus"
        title="CPUs"
        value={formValues.cpus}
        placeholder="Number of CPUs"
        onChange={(v) => setFormValues({ cpus: v })}
        error={formValues.cpus && Number.isNaN(Number(formValues.cpus)) ? "Must be a number" : undefined}
      />
      <Form.TextField
        id="memory"
        title="Memory (GiB)"
        value={formValues.memory}
        placeholder="Memory in GiB"
        onChange={(v) => setFormValues({ memory: v })}
        error={formValues.memory && Number.isNaN(Number(formValues.memory)) ? "Must be a number" : undefined}
      />
      <Form.TextField
        id="disk"
        title="Disk (GiB)"
        value={formValues.disk}
        placeholder="Disk size in GiB"
        onChange={(v) => setFormValues({ disk: v })}
        error={formValues.disk && Number.isNaN(Number(formValues.disk)) ? "Must be a number" : undefined}
      />
      <Form.Dropdown
        id="runtime"
        title="Runtime"
        value={formValues.runtime}
        onChange={(v) => setFormValues({ runtime: v as CreateInstanceFormValues["runtime"] })}
      >
        <Form.Dropdown.Item value="docker" title="docker" />
        <Form.Dropdown.Item value="containerd" title="containerd" />
        <Form.Dropdown.Item value="incus" title="incus" />
      </Form.Dropdown>
      <Form.Dropdown
        id="vmType"
        title="VM Type"
        value={formValues.vmType}
        onChange={(v) => setFormValues({ vmType: v as CreateInstanceFormValues["vmType"] })}
      >
        <Form.Dropdown.Item value="qemu" title="qemu" />
        <Form.Dropdown.Item value="vz" title="vz" />
        <Form.Dropdown.Item value="krunkit" title="krunkit" />
      </Form.Dropdown>
      <Form.Checkbox
        id="kubernetes"
        title="Kubernetes"
        label="Enable Kubernetes"
        value={formValues.kubernetes}
        onChange={(v) => setFormValues({ kubernetes: v })}
      />
      <Form.Description text="Note: Runtime, architecture, and VM type cannot be changed after creation." />
    </Form>
  );
}
