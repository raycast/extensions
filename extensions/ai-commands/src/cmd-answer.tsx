import { closeMainWindow, Clipboard, Detail, Icon, LaunchProps, List, showHUD, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import * as React from "react";
import { AnswerView } from "./lib/ui/AnswerView/main";
import { Creativity, ModelCapability } from "./lib/enum";
import { CommandAnswer } from "./lib/settings/enum";
import { COMMANDS_INFO } from "./lib/settings/defaultPrompts";
import { GetCustomCommandById } from "./lib/settings/settings";
import { GetModel, RunBackgroundInference } from "./lib/ui/AnswerView/function";
import { ThinkingEffort } from "./lib/ollama/types";

export default function Command(props: LaunchProps<{ arguments?: { id?: string } }>): React.JSX.Element {
  const customId = props.arguments?.id || (props.launchContext as { id?: string } | undefined)?.id;

  if (customId) {
    return <CustomCommandRunner id={customId} />;
  }

  const context = props.launchContext as
    | {
        command: CommandAnswer;
        prompt?: string;
        promptValues?: Record<string, string>;
        query?: string;
      }
    | undefined;

  if (!context) {
    // Fallback if launched directly without context
    return <AnswerView prompt="" capabilities={[ModelCapability.Completion]} />;
  }

  const prompt = context.prompt ?? COMMANDS_INFO[context.command]?.defaultPrompt ?? "";
  const isVision = context.command === CommandAnswer.IMAGE_DESCRIBE || context.command === CommandAnswer.IMAGE_TO_TEXT;

  return (
    <AnswerView
      command={context.command}
      prompt={prompt}
      promptValues={context.promptValues}
      creativity={context.command === CommandAnswer.TWEET ? Creativity.High : Creativity.Low}
      capabilities={isVision ? [ModelCapability.Vision] : [ModelCapability.Completion]}
      query={context.query}
    />
  );
}

function CustomCommandRunner({ id }: { id: string }): React.JSX.Element {
  const { data: command, isLoading, error } = usePromise(GetCustomCommandById, [id]);
  const [replacing, setReplacing] = React.useState(false);

  React.useEffect(() => {
    if (command && command.action === "replace" && !replacing) {
      setReplacing(true);
      (async () => {
        await closeMainWindow();
        const toast = await showToast({ style: Toast.Style.Animated, title: "Running inference..." });
        try {
          const model = await GetModel(undefined, command.server, command.model);
          const creativity = command.creativity !== undefined ? Number(command.creativity) : Creativity.Medium;
          const thinking = command.thinking !== "false" ? (command.thinking as ThinkingEffort) : false;
          const result = await RunBackgroundInference(model, command.prompt, creativity, thinking, command.keep_alive);
          await Clipboard.paste(result);
          await toast.hide();
          await showHUD("Text replaced successfully");
        } catch (e) {
          toast.style = Toast.Style.Failure;
          toast.title = "Error running command";
          toast.message = e instanceof Error ? e.message : String(e);
        }
      })();
    }
  }, [command]);

  if (isLoading) {
    return <Detail isLoading={true} markdown="Loading custom command..." />;
  }

  if (error || !command) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Custom Command Not Found"
          description={`No custom command found with ID "${id}". It may have been deleted in Manage AI Commands.`}
        />
      </List>
    );
  }

  if (command.action === "replace") {
    return <Detail isLoading={true} markdown="Replacing selection with AI output..." />;
  }

  return (
    <AnswerView
      server={command.server}
      model={command.model}
      prompt={command.prompt}
      creativity={command.creativity !== undefined ? Number(command.creativity) : Creativity.Medium}
      thinking={command.thinking !== "false" ? (command.thinking as ThinkingEffort) : undefined}
      keep_alive={command.keep_alive}
    />
  );
}
