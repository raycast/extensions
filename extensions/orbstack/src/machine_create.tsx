import { ActionPanel, Action, Form, showToast, Toast } from "@raycast/api";
import { useForm, FormValidation, useExec } from "@raycast/utils";
import { useState } from "react";
import { ORB_CTL, DISTROS, ARCHITECTURES } from "./orbstack";

interface Machine {
  distro: string;
  name: string;
  arch: string;
  user?: string;
  version?: string;
}

interface MachineCreateProps {
  refresh?: () => void;
}

export default function MachineCreate(props: MachineCreateProps) {
  const [machine, setMachine] = useState<Machine | null>(null);

  const createMachineCommand = (machine: Machine) => {
    const command = ["create"];

    if (machine.user && machine.user.trim() !== "") {
      command.push("-u", machine.user);
    }

    const distroWithVersion =
      machine.version && machine.version.trim() !== "" ? `${machine.distro}:${machine.version}` : machine.distro;

    command.push("-a", machine.arch, distroWithVersion, machine.name);
    return command;
  };

  const { isLoading } = useExec(ORB_CTL, machine ? createMachineCommand(machine) : [], {
    execute: machine !== null,
    timeout: 1000 * 120, // machine creation can take a bit so let's wait at least 2 minutes.
    onData: () => {
      showToast({
        title: "Machine Created",
        message: "Machine has been successfully created.",
        style: Toast.Style.Success,
      });
      setMachine(null);
      if (props.refresh) {
        props.refresh();
      }
    },
    onError: (e) => {
      showToast({
        title: "Machine Creation Failed",
        message: e.message,
        style: Toast.Style.Failure,
      });
      setMachine(null);
    },
  });

  const handleCreate = (values: Machine) => {
    setMachine(values);
    showToast({
      title: "Creating Machine",
      message: "Please wait.",
      style: Toast.Style.Animated,
    });
  };

  const { handleSubmit, itemProps } = useForm<Machine>({
    onSubmit: handleCreate,
    validation: {
      name: FormValidation.Required,
      distro: FormValidation.Required,
      arch: FormValidation.Required,
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Machine" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Machine Name" placeholder="Enter a name for your Machine" {...itemProps.name} />
      <Form.Dropdown title="Distribution" {...itemProps.distro}>
        {DISTROS.map((distro) => (
          <Form.Dropdown.Item key={distro.value} value={distro.value} title={distro.title} />
        ))}
      </Form.Dropdown>
      <Form.TextField title="Version" placeholder="Leave blank for default distro version" {...itemProps.version} />
      <Form.Dropdown title="Arch" {...itemProps.arch}>
        {ARCHITECTURES.map((arch) => (
          <Form.Dropdown.Item key={arch.value} value={arch.value} title={arch.title} />
        ))}
      </Form.Dropdown>
      <Form.TextField title="Username" placeholder="Leave blank for default username" {...itemProps.user} />
    </Form>
  );
}
