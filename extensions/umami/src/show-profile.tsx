import { Action, ActionPanel, Detail, Form, Icon, popToRoot, showToast, Toast } from "@raycast/api";
import { IS_CLOUD, umami } from "./lib/umami";
import ErrorComponent from "./components/ErrorComponent";
import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";
import { UmamiMe, UmamiUpdateMyPassword } from "./lib/types";
import WithUmami from "./components/WithUmami";
import { handleUmamiError } from "./lib/utils";

export default function Main() {
  return (
    <WithUmami>
      <Me />
    </WithUmami>
  );
}

function Me() {
  const { isLoading, data, error } = useCachedPromise(async () => {
    const { ok, data, error } = await umami.getMe();
    if (!ok) handleUmamiError(error);
    const userData = data as { user: UmamiMe } | UmamiMe;
    return "user" in userData ? userData.user : userData;
  });

  return error ? (
    <ErrorComponent error={error} />
  ) : (
    <Detail
      isLoading={isLoading}
      metadata={
        data && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="ID" text={data.id} />
            <Detail.Metadata.Label title="Username" text={data.username} />
            <Detail.Metadata.TagList title="Role">
              <Detail.Metadata.TagList.Item text={data.role} />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Label title="Created At" text={data.createdAt} />
            <Detail.Metadata.Label title="Is Admin" icon={data.isAdmin ? Icon.Check : Icon.Xmark} />
          </Detail.Metadata>
        )
      }
      actions={
        !data ? undefined : (
          <ActionPanel>
            {!IS_CLOUD && <Action.Push icon={Icon.Pencil} title="Update My Password" target={<UpdateMyPassword />} />}
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
        const { ok, error } = await umami.updateMyPassword(values);
        if (!ok) handleUmamiError(error);
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
          <Action.SubmitForm icon={Icon.Pencil} title="Update My Password" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.PasswordField title="Current Password" placeholder="hunter2" {...itemProps.currentPassword} />
      <Form.PasswordField title="New Password" placeholder="correct-horse-battery-staple" {...itemProps.newPassword} />
    </Form>
  );
}
