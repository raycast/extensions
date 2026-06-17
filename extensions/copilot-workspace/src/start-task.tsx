import { Action, ActionPanel, Form, open, popToRoot } from "@raycast/api";
import { FormValidation, useCachedState, useForm } from "@raycast/utils";
import { validateRepo } from "./validate-repo";

export default function Command() {
  const [repo, setRepo] = useCachedState("repo", "");

  interface FormValues {
    task: string;
    repo: string;
  }

  const { handleSubmit, itemProps } = useForm<FormValues>({
    onSubmit(values) {
      const repo = values.repo || "githubnext/workspace-blank";

      open(
        `https://copilot-workspace.githubnext.com/${repo}?task=${encodeURIComponent(
          values.task,
        )}`,
      );

      setRepo(values.repo);
      popToRoot();
    },
    validation: {
      task: FormValidation.Required,
      repo: (value) => {
        if (value && !validateRepo(value)) {
          return "Invalid repository. Please provide a valid repository name in the format owner/repo";
        }
      },
    },
    initialValues: { repo: repo },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        title="Task"
        placeholder="Describe a task..."
        {...itemProps.task}
      />
      <Form.TextField
        title="Repository"
        placeholder="e.g. owner/repo"
        {...itemProps.repo}
      />
      <Form.Description text="Leave the repository field empty to create a new repository." />
    </Form>
  );
}
