import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Detail,
  PopToRootType,
  closeMainWindow,
  confirmAlert,
  getPreferenceValues,
  open,
  showInFinder,
  trash,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, useExec } from "@raycast/utils";
import { join } from "path";
import { useMemo, useState } from "react";
import { Command, Prompt, UseExecError } from "./types";
import { CodeBlock, GetCreateNextAppArguments, GetExecutableInfo, PathExists } from "./utils";

const codeEditor = getPreferenceValues<Preferences.Index>()["editor"];

export default function Output({
  command,
  prompt,
  environment,
}: {
  command: Command;
  prompt: Prompt;
  environment: Awaited<ReturnType<typeof GetExecutableInfo>>["environment"];
}) {
  const { pop } = useNavigation();
  const [output, setOutput] = useState<string>("");

  const commandArguments = useMemo<string[]>(
    () => command.arguments.concat(GetCreateNextAppArguments({ prompt })),
    [command.arguments, prompt],
  );

  const { isLoading } = useExec(command.executable, commandArguments, {
    execute: true,
    stripFinalNewline: true,
    env: environment,
    onWillExecute: () => {
      //   console.log("useExec:onWillExecute");
    },
    onData: (data) => {
      //   console.log("useExec:onData");
      setOutput(data);
    },
    onError: (error) => {
      //   console.log("useExec:onError");
      const execError = UseExecError.parse(error);
      setOutput(execError.stdout || execError.stderr || execError.shortMessage || execError.message);
    },
  });

  const projectPath = useMemo(() => join(prompt.workspace, prompt.project), [prompt.workspace, prompt.project]);
  const formattedCommand = useMemo(
    () =>
      CodeBlock({ code: `$ ${command.executable.split("/").at(-1)} ${command.arguments.join(" ")}`, language: "bash" }),
    [command],
  );
  const markdown = useMemo(() => (output ? CodeBlock({ code: output, language: "bash" }) : formattedCommand), [output]);

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading}
      actions={
        !isLoading && (
          <ActionPanel>
            <Action
              title="Open in Editor"
              onAction={() => {
                if (PathExists({ path: projectPath, type: "Directory" })) {
                  open(projectPath, codeEditor?.name).then(() =>
                    closeMainWindow({ popToRootType: PopToRootType.Default }),
                  );
                } else {
                  showFailureToast(`No folder at ${projectPath}`, { title: "Project Not Found" });
                }
              }}
            />
            <Action
              title="Open in Finder"
              onAction={() => {
                if (PathExists({ path: projectPath, type: "Directory" })) {
                  showInFinder(projectPath).then(() => closeMainWindow({ popToRootType: PopToRootType.Default }));
                } else {
                  showFailureToast(`No folder at ${projectPath}`, { title: "Project Not Found" });
                }
              }}
            />
            <Action
              title="Move to Trash"
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
              onAction={async () => {
                if (PathExists({ path: projectPath, type: "Directory" })) {
                  const deletionConfirmed = await confirmAlert({
                    title: `Move project to Trash?`,
                    message: prompt.project,
                    primaryAction: {
                      title: "Confirm",
                      style: Alert.ActionStyle.Destructive,
                    },
                    rememberUserChoice: true,
                  });
                  if (deletionConfirmed) trash(projectPath).then(pop);
                } else {
                  showFailureToast(`No folder at ${projectPath}`, { title: "Project Not Found" });
                }
              }}
            />
            <Action.CopyToClipboard content={output} shortcut={{ modifiers: ["cmd"], key: "c" }} />
          </ActionPanel>
        )
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Workspace" text={prompt.workspace} />
          <Detail.Metadata.Label title="Project" text={prompt.project} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Import Alias">
            <Detail.Metadata.TagList.Item color={Color.PrimaryText} text={prompt.importAlias} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="Plugins">
            <Detail.Metadata.TagList.Item
              color={prompt.typescript ? Color.Green : Color.SecondaryText}
              text="TypeScript"
            />
            <Detail.Metadata.TagList.Item color={prompt.tailwind ? Color.Green : Color.SecondaryText} text="Tailwind" />
            <Detail.Metadata.TagList.Item color={prompt.eslint ? Color.Green : Color.SecondaryText} text="ESLint" />
            <Detail.Metadata.TagList.Item color={prompt.prettier ? Color.Green : Color.SecondaryText} text="Prettier" />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="Features">
            <Detail.Metadata.TagList.Item color={prompt.app ? Color.Green : Color.SecondaryText} text="App Router" />
            <Detail.Metadata.TagList.Item
              color={prompt.srcDir ? Color.Green : Color.SecondaryText}
              text="src/ Folder"
            />
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
    />
  );
}
