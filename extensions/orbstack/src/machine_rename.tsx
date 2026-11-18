import { ActionPanel, Action, Form, showToast, Toast } from "@raycast/api";
import { useForm, FormValidation, useExec } from "@raycast/utils";
import { useState, useMemo } from "react";
import { ORB_CTL } from "./orbstack";
import { useMachineList } from "./hooks";

interface MachineRenameProps {
  oldName?: string;
  refresh?: () => void;
}

export default function MachineRename(props: MachineRenameProps) {
  const [renameArgs, setRenameArgs] = useState<{ old_name: string; new_name: string } | null>(null);
  const { machines } = useMachineList();

  const machineOptions = useMemo(() => machines.map((m) => ({ value: m.name, title: m.name })), [machines]);

  const { isLoading } = useExec(ORB_CTL, renameArgs ? ["rename", renameArgs.old_name, renameArgs.new_name] : [], {
    execute: renameArgs !== null,
    timeout: 1000 * 60,
    onData: () => {
      showToast({ title: "Rename complete", message: "Machine renamed", style: Toast.Style.Success });
      setRenameArgs(null);
      props.refresh?.();
    },
    onError: (e) => {
      showToast({ title: "Rename failed", message: e.message, style: Toast.Style.Failure });
      setRenameArgs(null);
    },
  });

  const handleRename = (values: { old_name: string; new_name: string }) => {
    setRenameArgs(values);
    showToast({
      title: "Renaming machine",
      message: `${values.old_name} → ${values.new_name}`,
      style: Toast.Style.Animated,
    });
  };

  const { handleSubmit, itemProps } = useForm<{ old_name: string; new_name: string }>({
    onSubmit: handleRename,
    validation: {
      old_name: FormValidation.Required,
      new_name: (v) => {
        if (!v || v.trim() === "") return "New name is required";
        if (v.includes("_")) return "Name must not contain underscores";
        return undefined;
      },
    },
    initialValues: { old_name: props.oldName ?? "", new_name: props.oldName ?? "" },
  });

  const handleOldNameChange = (value: string) => {
    const prevOld = itemProps.old_name.value ?? "";
    const currNew = itemProps.new_name.value ?? "";

    itemProps.old_name.onChange?.(value);

    if (!currNew || currNew === prevOld) {
      itemProps.new_name.onChange?.(value);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={<ActionPanel>{<Action.SubmitForm title="Rename Machine" onSubmit={handleSubmit} />}</ActionPanel>}
    >
      <Form.Dropdown title="Old Name" {...itemProps.old_name} onChange={handleOldNameChange}>
        {machineOptions.map((m) => (
          <Form.Dropdown.Item key={m.value} value={m.value} title={m.title} />
        ))}
      </Form.Dropdown>
      <Form.TextField title="New Name" placeholder="Enter the new name" {...itemProps.new_name} />
    </Form>
  );
}
