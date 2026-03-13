import { Action, ActionPanel, Detail, useNavigation, getFrontmostApplication, Icon } from "@raycast/api";
import { useCallback, useState } from "react";
import composerize from "composerize";
import decomposerize from "decomposerize";
import { showFailureToast } from "@raycast/utils";

type ComposerizeType = "composerize" | "decomposerize";

export default function useComposerize(composerizeType: ComposerizeType) {
  const [command, setCommand] = useState<string>("");
  const { push } = useNavigation();

  const submit = useCallback(async () => {
    try {
      const app = await getFrontmostApplication();
      const compose = composerizeType === "composerize" ? composerize(command) : decomposerize(command);
      const markdown =
        composerizeType === "composerize" ? `\`\`\`yaml\n${compose}\n\`\`\`` : `\`\`\`\n${compose}\n\`\`\``;
      push(
        <Detail
          navigationTitle={composerizeType === "composerize" ? "Docker to Compose" : "Compose to Docker"}
          markdown={markdown}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard icon={Icon.Clipboard} title="Copy to Clipboard" content={compose} />
              <Action.Paste icon={Icon.Pencil} content={compose} title={`Paste${app ? ` in ${app.name}` : ""}`} />
            </ActionPanel>
          }
        />,
      );
    } catch (error) {
      console.error(error);
      showFailureToast(error, {
        title: "Failed to convert",
      });
    }
  }, [command]);

  return {
    command,
    setCommand,
    submit,
  };
}
