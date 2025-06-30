import { Action, ActionPanel, Form, Icon, launchCommand, LaunchType, showToast, Toast } from "@raycast/api";
import { FormValidation, showFailureToast, useForm } from "@raycast/utils";
import { useRepoStorage } from "./hooks/useRepo.js";

export default function Command() {
  const repo = useRepoStorage();

  const { handleSubmit, itemProps } = useForm({
    onSubmit({ newRepo }: { newRepo: string[] }) {
      repo
        .setValue(newRepo[0])
        .then(() => {
          showToast({
            style: Toast.Style.Success,
            title: "Repo set",
            message: `${newRepo[0]}`,
          });

          launchCommand({
            name: "quick-git",
            type: LaunchType.UserInitiated,
          }).catch((error) => {
            showFailureToast(error, {
              title: "Could not launch the Quick Git command",
            });
          });
        })
        .catch((error) => {
          showFailureToast(error, {
            title: "Could not set this as your selected repo",
          });
        });
    },
    validation: {
      newRepo: FormValidation.Required,
    },
  });

  return (
    <Form
      navigationTitle="Select Git Repo"
      isLoading={repo.isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Set Repo" onSubmit={handleSubmit} icon={Icon.Checkmark} />
          <Action.SubmitForm title="Unset Repo" onSubmit={repo.removeValue} icon={Icon.Xmark} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="newRepo"
        title="Repo Directory"
        canChooseDirectories
        storeValue
        allowMultipleSelection={false}
        canChooseFiles={false}
        defaultValue={repo.value ? [repo.value] : undefined}
        autoFocus
        error={itemProps.newRepo.error}
      />
    </Form>
  );
}
