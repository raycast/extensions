import { Action, ActionPanel, Detail, Form, Icon, popToRoot, showToast, Toast, useNavigation } from "@raycast/api";
import { IS_CLOUD, umami } from "./lib/umami";
import ErrorComponent from "./components/ErrorComponent";
import { FormValidation, showFailureToast, useCachedPromise, useForm } from "@raycast/utils";
import { UmamiMe, UmamiUpdateMyPassword } from "./lib/types";
import { handleUmamiError } from "./lib/utils";

export default function Me() {
  const { push } = useNavigation();
  const { isLoading, data, error } = useCachedPromise(async () => {
    const { data, error } = await umami.getMe();
    handleUmamiError(error);
    return data as UmamiMe;
  });

  const markdown = data
    ? Object.entries(data)
        .map(([key, value]) => `${key} = ${value}`)
        .join("\n\n")
    : "";

  async function pushUpdateMyPassword() {
    if (IS_CLOUD) {
      await showFailureToast("Not available in Umami Cloud", {
        title: "ERROR",
      });
    } else {
      push(<UpdateMyPassword />);
    }
  }

  return error ? (
    <ErrorComponent error={error} />
  ) : (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        !data ? undefined : (
          <ActionPanel>
            <Action icon={Icon.Pencil} title="Update My Password" onAction={pushUpdateMyPassword} />
          </ActionPanel>
        )
      }
    />
  );
}

function UpdateMyPassword() {
  const { handleSubmit, itemProps } = useForm<UmamiUpdateMyPassword>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Updating");
      try {
        const { error } = await umami.updateMyPassword(values);
        handleUmamiError(error);
        toast.style = Toast.Style.Success;
        toast.title = "Updated";
        await popToRoot();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    },
    validation: {
      currentPassword: FormValidation.Required,
      newPassword: FormValidation.Required,
    },
  });

  return (
    <Form
      navigationTitle="Update My Password"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.PasswordField title="Current Password" placeholder="hunter2" {...itemProps.currentPassword} />
      <Form.PasswordField title="New Password" placeholder="correct-horse-battery-staple" {...itemProps.newPassword} />
    </Form>
  );
}
