import { Action, ActionPanel, Form } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useState } from "react";
import { type CreateProjectBody } from "../../api/index.js";
import { ClientDropdown } from "../shared/ClientDropdown.js";
import { ColorDropdown } from "../shared/ColorDropdown.js";

export function ProjectForm(props: {
  initialValues?: Partial<CreateProjectBody>;
  onSubmit: (values: CreateProjectBody) => void;
}) {
  const { handleSubmit, itemProps, setValue } = useForm<CreateProjectBody>({
    onSubmit(values) {
      delete values.billable;
      values.client_id ??= null;
      values.billable_rate ??= null;
      values.is_billable ??= false;
      values.client_id ??= null;
      values.estimated_time ??= null;
      props.onSubmit(values);
    },
    initialValues: props.initialValues,
    validation: {
      name: FormValidation.Required,
      billable_rate: (value: unknown) => {
        if (billable !== "custom") return;
        if (!value || typeof value !== "string") return FormValidation.Required;
        const asNumber = Number.parseInt(value, 10);
        if (Number.isNaN(asNumber) || asNumber < 0) return "Must be positive";
      },
    },
  });

  type InternalBillable = "yes" | "no" | "custom";
  let defaultBillable: InternalBillable = "no";
  if (props.initialValues?.billable_rate) defaultBillable = "custom";
  else if (props.initialValues?.is_billable) defaultBillable = "yes";
  const [billable, setBillable] = useState(defaultBillable);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" {...itemProps.name} />
      <Form.Dropdown
        id="billable"
        title="Billable"
        value={billable}
        onChange={(value) => {
          const newValue = value as InternalBillable;
          setBillable(newValue);
          setValue("is_billable", newValue !== "no");
          if (newValue !== "custom") {
            setValue("billable_rate", null);
          }
        }}
      >
        <Form.Dropdown.Item value="no" title="Non-Billable" />
        <Form.Dropdown.Item value="yes" title="Default Rate" />
        <Form.Dropdown.Item value="custom" title="Custom Rate" />
      </Form.Dropdown>
      {billable === "custom" && (
        <Form.TextField
          title="Billable Rate"
          id={itemProps.billable_rate.id}
          error={itemProps.billable_rate.error}
          // {...itemProps.billable_rate}
          value={itemProps.billable_rate.value?.toString() ?? undefined}
          defaultValue={itemProps.billable_rate.defaultValue?.toString() ?? undefined}
          onChange={(value) => {
            const newValue = Number.parseFloat(value);
            itemProps.billable_rate.onChange?.(Number.isNaN(newValue) ? null : newValue);
          }}
        />
      )}
      <ClientDropdown
        {...itemProps.client_id}
        value={itemProps.client_id.value ?? undefined}
        defaultValue={itemProps.client_id.defaultValue ?? undefined}
      />
      <ColorDropdown title="Color" {...itemProps.color} />
    </Form>
  );
}
