import { getWorktreeConfig, saveWorktreeConfig } from "#/helpers/worktree-config";
import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm, usePromise } from "@raycast/utils";
import { useRef } from "react";

type SetupActionsProps = {
  projectPath: string;
};

export const SetupActions = ({ projectPath }: SetupActionsProps) => {
  const { push } = useNavigation();

  return (
    <Action
      title="Setup Actions"
      icon={Icon.Hammer}
      shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
      onAction={() => push(<SetupActionsForm projectPath={projectPath} />)}
    />
  );
};

interface SetupActionsFormValues {
  commands: string;
}

const SetupActionsForm = ({ projectPath }: SetupActionsProps) => {
  const { pop } = useNavigation();

  const abortable = useRef<AbortController>(null);

  const { isLoading, data } = usePromise(
    async (path: string) => {
      const config = await getWorktreeConfig(path);

      const commands = config?.["setup-worktree"] ?? [];

      const commandsString = commands.join("\n");

      reset({ commands: commandsString });

      return commandsString;
    },
    [projectPath],
    {
      abortable,
    },
  );

  const { handleSubmit, itemProps, reset } = useForm<SetupActionsFormValues>({
    initialValues: {
      commands: data,
    },
    async onSubmit(values) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Saving Setup Actions",
        message: "Please wait...",
      });

      try {
        // Parse commands from textarea (one per line, filter empty lines)
        const commands = values.commands
          .split("\n")
          .map((cmd) => cmd.trim())
          .filter((cmd) => cmd.length > 0);

        await saveWorktreeConfig(projectPath, {
          "setup-worktree": commands,
        });

        toast.style = Toast.Style.Success;
        toast.title = "Setup Actions Saved";
        toast.message = `${commands.length} command${commands.length !== 1 ? "s" : ""} saved`;

        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to Save";
        toast.message = error instanceof Error ? error.message : "Unknown error occurred";
      }
    },
  });

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Setup Actions"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Configure commands to run automatically when creating a new worktree." />

      <Form.TextArea
        title="Commands"
        placeholder="pnpm install&#10;cp ../.env .env"
        info="Enter one command per line. Commands run in order when a new worktree is created."
        {...itemProps.commands}
        autoFocus
      />

      <Form.Separator />

      <Form.Description
        title="Available Variables"
        text="$RECENT_WORKTREE_PATH - Path to the most recently modified worktree (useful for copying files)"
      />

      <Form.Description
        title="Example"
        text={`pnpm install\ncp $RECENT_WORKTREE_PATH/.env .env\ncp $RECENT_WORKTREE_PATH/.env.local .env.local`}
      />
    </Form>
  );
};
