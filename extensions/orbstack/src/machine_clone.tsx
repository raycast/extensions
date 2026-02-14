import { ActionPanel, Action, Form, showToast, Toast } from "@raycast/api";
import { useForm, FormValidation, useExec } from "@raycast/utils";
import { useState, useMemo } from "react";
import { ORB_CTL } from "./orbstack";
import { useMachineList } from "./hooks";

interface MachineCloneProps {
  oldName?: string;
  refresh?: () => void;
}

export default function MachineClone(props: MachineCloneProps) {
  const [cloneArgs, setCloneArgs] = useState<{ old_name: string; new_name: string } | null>(null);
  const { machines } = useMachineList();

  const machineOptions = useMemo(() => machines.map((m) => ({ value: m.name, title: m.name })), [machines]);

  const { isLoading } = useExec(ORB_CTL, cloneArgs ? ["clone", cloneArgs.old_name, cloneArgs.new_name] : [], {
    execute: cloneArgs !== null,
    timeout: 1000 * 60 * 2,
    onData: () => {
      showToast({ title: "Clone complete", message: "Clone machine created", style: Toast.Style.Success });
      setCloneArgs(null);
      props.refresh?.();
    },
    onError: (e) => {
      showToast({ title: "Clone failed", message: e.message, style: Toast.Style.Failure });
      setCloneArgs(null);
    },
  });

  const handleClone = (values: { old_name: string; new_name: string }) => {
    if (values.new_name === values.old_name) {
      showToast({
        title: "Clone failed",
        message: "New name must be different from old name",
        style: Toast.Style.Failure,
      });
      return;
    }
    setCloneArgs(values);
    showToast({
      title: "Cloning machine",
      message: `${values.old_name} → ${values.new_name}`,
      style: Toast.Style.Animated,
    });
  };

  const { handleSubmit, itemProps } = useForm<{ old_name: string; new_name: string }>({
    onSubmit: handleClone,
    validation: {
      old_name: FormValidation.Required,
      new_name: (v) => {
        if (!v || v.trim() === "") return "New name is required";
        if (v.includes("_")) return "Name must not contain underscores";
        return undefined;
      },
    },
    // Prepopulate new_name with the old name suffixed by '-clone' for convenience
    initialValues: { old_name: props.oldName ?? "", new_name: props.oldName ? `${props.oldName}-clone` : "" },
  });

  // Keep new_name in sync when the user selects a different old machine.
  // Only auto-update new_name when the field is empty or currently matches the previous '<old>-clone',
  // so we don't clobber user edits.
  const handleOldNameChange = (value: string) => {
    const prevOld = itemProps.old_name.value ?? "";
    const currNew = itemProps.new_name.value ?? "";

    itemProps.old_name.onChange?.(value);

    // auto-update new_name only if it's empty or equals the previous '<old>-clone'
    if (!currNew || currNew === `${prevOld}-clone`) {
      itemProps.new_name.onChange?.(`${value}-clone`);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={<ActionPanel>{<Action.SubmitForm title="Clone Machine" onSubmit={handleSubmit} />}</ActionPanel>}
    >
      <Form.Dropdown title="Old Machine" {...itemProps.old_name} onChange={handleOldNameChange}>
        {machineOptions.map((m) => (
          <Form.Dropdown.Item key={m.value} value={m.value} title={m.title} />
        ))}
      </Form.Dropdown>
      <Form.TextField title="New Name" placeholder="Enter a name for the cloned machine" {...itemProps.new_name} />
    </Form>
  );
}
