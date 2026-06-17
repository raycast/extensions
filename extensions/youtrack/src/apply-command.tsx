import type { Command, CommandSuggestions, Issue, IssueExtended } from "./interfaces";
import { useCallback, useState } from "react";
import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { stripHtmlTags } from "./utils";
import useDebouncedCallback from "beautiful-react-hooks/useDebouncedCallback";

const NO_COMMAND_PREVIEW = "No command preview available";
const DEBOUNCE_TIME = 300;

export function ApplyCommand(props: {
  issue: Issue;
  getIssueDetailsCb: () => Promise<IssueExtended | void>;
  applyCommandCb: (command: Command) => Promise<void>;
  getCommandSuggestions: (command: string) => Promise<CommandSuggestions>;
  link: string;
  instance: string;
}) {
  const { issue } = props;
  const { pop } = useNavigation();
  const [command, setCommand] = useState<string>("");
  const [commandError, setCommandError] = useState<string | undefined>();
  const [commandPreview, setCommandPreview] = useState<string>(NO_COMMAND_PREVIEW);
  const [comment, setComment] = useState<string>("");
  const [silent, setSilent] = useState<boolean>(true);

  const processCommandSuggestions = useCallback((commands: CommandSuggestions["commands"]) => {
    const preview = commands.map((command) => stripHtmlTags(command.description)).join("\n");
    const hasError = commands.some((command) => command.error);
    return { preview, hasError };
  }, []);

  const debouncedGetCommandSuggestions = useDebouncedCallback(
    async (value: string) => {
      try {
        const suggestions = await props.getCommandSuggestions(value);
        if (!suggestions) {
          return;
        }
        const { preview, hasError } = processCommandSuggestions(suggestions.commands);

        setCommandPreview(preview);
        setCommandError(hasError ? "Command has error" : undefined);
      } catch {
        setCommandError("Failed to load command suggestions");
        setCommandPreview(NO_COMMAND_PREVIEW);
      }
    },
    [processCommandSuggestions, DEBOUNCE_TIME],
  );

  // Helper function to handle empty command state
  const resetCommandState = useCallback(() => {
    setCommandError(undefined);
    setCommandPreview(NO_COMMAND_PREVIEW);
  }, []);

  const { handleSubmit } = useForm<Command>({
    async onSubmit({ comment, command, silent }) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Applying command",
      });

      if (!props.applyCommandCb) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed applying command, missing callback function";
        return;
      }

      try {
        await props.applyCommandCb({ command, comment, silent });
        toast.style = Toast.Style.Success;
        toast.title = "Command applied";
        toast.primaryAction = {
          title: "Go Back",
          onAction: pop,
          shortcut: {
            modifiers: ["cmd"],
            key: "enter",
          },
        };
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed applying command";
        // @ts-expect-error message is not defined on Error
        toast.message = `${error?.message || "Unknown error occurred"}`;
      }
    },
  });

  const handleCommandChange = useCallback(
    (value: string) => {
      setCommand(value);

      if (!value) {
        resetCommandState();
        return;
      }

      debouncedGetCommandSuggestions(value);
    },
    [debouncedGetCommandSuggestions, resetCommandState],
  );

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.Checkmark}
            title="Apply Command"
            onSubmit={(values: Command) => {
              handleSubmit(values);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Issue" text={`${issue.id} - ${issue.summary}`} />
      <Form.TextField
        id="command"
        title="Command"
        placeholder="e.g. `for me`"
        value={command}
        autoFocus
        error={commandError}
        onChange={handleCommandChange}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setCommandError("The field should't be empty!");
          } else {
            setCommandError(undefined);
          }
        }}
      />
      <Form.Description title="Command Preview" text={commandPreview} />
      <Form.TextArea id="comment" title="Comment" placeholder="" value={comment} onChange={setComment} />
      <Form.Checkbox id="silent" label="Silent" value={silent} onChange={setSilent} />
    </Form>
  );
}
