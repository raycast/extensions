import { Action, ActionPanel, Form, List, showToast, Toast, popToRoot, Icon } from "@raycast/api";
import { useForm, usePromise, FormValidation } from "@raycast/utils";
import { useInstallGuard } from "./install-guard";
import { watchkeySet, watchkeyList } from "./watchkey";

function UpdateForm({ service }: { service: string }) {
  const { handleSubmit, itemProps } = useForm<{ value: string }>({
    onSubmit: async (values) => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Updating secret..." });
      try {
        await watchkeySet(service, values.value);
        toast.style = Toast.Style.Success;
        toast.title = `Updated "${service}"`;
        await popToRoot();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to update secret";
        toast.message = error instanceof Error ? error.message : String(error);
      }
    },
    validation: {
      value: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Secret" icon={Icon.Key} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Key Name" text={service} />
      <Form.PasswordField title="New Secret Value" placeholder="Enter new secret" {...itemProps.value} />
    </Form>
  );
}

export default function UpdateKey() {
  const { installed, installView } = useInstallGuard();
  const { data: keys, isLoading } = usePromise(watchkeyList, [], { execute: installed });

  if (!installed) return installView;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search keys...">
      {keys?.map((key) => (
        <List.Item
          key={key}
          title={key}
          icon={Icon.Key}
          actions={
            <ActionPanel>
              <Action.Push title="Update Secret" icon={Icon.Pencil} target={<UpdateForm service={key} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
