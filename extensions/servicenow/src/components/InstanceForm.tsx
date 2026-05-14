import { useMemo } from "react";
import { ActionPanel, Action, Form, Icon, useNavigation, Color, Keyboard, confirmAlert, Alert } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import crypto from "crypto";
import { Instance } from "../types";
import useInstances from "../hooks/useInstances";

type InstanceFormValues = Omit<Instance, "id">;

type SetInstanceFormProps = {
  onSubmit: (value: Instance) => Promise<void>;
  instance?: Instance;
};

export default function InstanceForm({ onSubmit, instance }: SetInstanceFormProps) {
  const { pop } = useNavigation();
  const { deleteInstance } = useInstances();

  const { itemProps, handleSubmit } = useForm<InstanceFormValues>({
    async onSubmit(values) {
      const normalized = { ...values, name: values.name.trim().replace(/\/+$/, "") };
      instance
        ? await onSubmit({ ...instance, ...normalized })
        : await onSubmit({ ...normalized, id: crypto.randomUUID() });
      pop();
    },
    initialValues: {
      name: instance?.name,
      alias: instance?.alias,
      color: instance?.color,
      username: instance?.username,
      password: instance?.password,
      full: instance?.full,
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
      enableDrafts={!instance}
      isLoading={false}
      actions={
        <ActionPanel>
          <ActionPanel.Section
            title={`${instance?.alias ? instance.alias + " (" + instance.name + ")" : instance?.name}`}
          >
            <Action.SubmitForm onSubmit={handleSubmit} icon={Icon.SaveDocument} title={"Save"} />
            <Action
              title="Delete"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={Keyboard.Shortcut.Common.Remove}
              onAction={() =>
                confirmAlert({
                  title: "Delete Instance Profile",
                  message: `Are you sure you want to delete "${instance?.alias ? instance.alias + " (" + instance.name + ")" : instance?.name}"?`,
                  primaryAction: {
                    style: Alert.ActionStyle.Destructive,
                    title: "Delete",
                    onAction: () => {
                      deleteInstance(instance?.id || "");
                      pop();
                    },
                  },
                })
              }
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              title="Download Extension Update Set"
              icon={Icon.Download}
              url="https://developer.servicenow.com/connect.do#!/share/contents/3108109_servicenow_raycast_extension"
              shortcut={{ modifiers: ["cmd"], key: "u" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextField
        {...itemProps.name}
        title="Instance URL"
        placeholder="acme or https://sn.internal.corp"
        info={`Enter the subdomain for a commercial cloud instance (e.g. "acme" → https://acme.service-now.com), or a full URL for FedRAMP, on-prem, or custom domains (e.g. https://gov.servicenowservices.com, https://sn.internal.corp).`}
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
      <Form.TextField {...itemProps.username} title="Username" placeholder="Enter a username" />
      <Form.PasswordField {...itemProps.password} title="Password" />
      <Form.Separator />
      <Form.Description
        title="Full Version"
        text={`Enable the full version if this is an admin account or the instance has this extension's Update Set installed. Press ⌘U to download the Update Set.`}
      />
      <Form.Dropdown
        {...itemProps.full}
        info={`Full version includes:\n- Manage your Favorites\n- View your Search History\n- View your full Navigation History (limited otherwise)`}
      >
        <Form.Dropdown.Item
          key="yes"
          title="Yes"
          value="true"
          icon={{ source: Icon.LockDisabled, tintColor: Color.Green }}
        />
        <Form.Dropdown.Item key="no" title="No" value="false" icon={{ source: Icon.Lock, tintColor: Color.Orange }} />
      </Form.Dropdown>
    </Form>
  );
}
