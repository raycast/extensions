import { Action, ActionPanel, Form, Icon, showToast, Toast } from "@raycast/api";
import { FormValidation, showFailureToast, useForm } from "@raycast/utils";
import { useRepoStorage } from "../../hooks/useRepo.js";
import { OpenPreferences } from "../actions/OpenPreferences.js";
import { launchQuickGit } from "../../utils/launchCommands.js";

export function ChooseDirectory() {
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

          launchQuickGit();
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
      navigationTitle="Select Specific Git Repo"
      isLoading={repo.isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Set Repo" onSubmit={handleSubmit} icon={Icon.Checkmark} />
          <Action.SubmitForm title="Unset Repo" onSubmit={repo.removeValue} icon={Icon.Xmark} />
          <OpenPreferences />
        </ActionPanel>
      }
    >
      <Form.Description text="Manually select a repo from your computer, it can be outside of the 'Location of git projects' preference." />
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
