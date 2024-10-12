import { useMemo } from "react";
import { ActionPanel, Action, Form, Icon, useNavigation, Color } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import crypto from "crypto";

import { Instance } from "../hooks/useInstances";

type InstanceFormValues = Omit<Instance, "id">;

type SetInstanceFormProps = {
  onSubmit: (value: Instance) => Promise<void>;
  instance?: Instance;
};

export default function InstanceForm({ onSubmit, instance }: SetInstanceFormProps) {
  const { pop } = useNavigation();

  const { itemProps, handleSubmit } = useForm<InstanceFormValues>({
    async onSubmit(values) {
      instance ? await onSubmit({ ...instance, ...values }) : await onSubmit({ ...values, id: crypto.randomUUID() });
      pop();
    },
    initialValues: {
      name: instance?.name,
      alias: instance?.alias,
      color: instance?.color,
      username: instance?.username,
      password: instance?.password,
    },
    validation: {
      name: FormValidation.Required,
      username: FormValidation.Required,
      password: FormValidation.Required,
    },
  });

  const colors = useMemo(() => Object.entries(Color), []);

  let title;
  if (instance) {
    title = "Edit";
  } else {
    title = "Add";
  }

  return (
    <Form
      navigationTitle={"Manage Instance Profiles - " + title}
      enableDrafts
      isLoading={false}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} icon={Icon.SaveDocument} title={"Save"} />
        </ActionPanel>
      }
    >
      <Form.TextField
        {...itemProps.name}
        title="Name"
        placeholder="Enter the instance name"
        info="The name is the unique identifier of your ServiceNow instance"
      />
      <Form.TextField
        {...itemProps.alias}
        title="Alias"
        placeholder="Production, dev, sandbox, PDI, etc."
        info="Use an alias to easily recognize your instance"
      />
      <Form.Dropdown {...itemProps.color} title="Color">
        {colors.map(([key, value]) => {
          return (
            <Form.Dropdown.Item
              key={key}
              title={key}
              value={value.toString()}
              icon={{ source: Icon.Circle, tintColor: key }}
            />
          );
        })}
      </Form.Dropdown>

      <Form.TextField
        {...itemProps.username}
        title="Username"
        placeholder="Enter a username"
        info="The minimum distance in meters from the place that would trigger the reminder"
      />
      <Form.PasswordField
        {...itemProps.password}
        title="Password"
        info="The minimum distance in meters from the place that would trigger the reminder"
      />
    </Form>
  );
}
