import { useState, useEffect, useMemo } from "react";
import {
  Action,
  ActionPanel,
  closeMainWindow,
  showToast,
  Toast,
  List,
  Icon,
  openCommandPreferences,
} from "@raycast/api";
import { usePersistentState } from "raycast-toolkit";
import { creditsUrl } from "./config";
import { checkRemainingCredits, getKnownPrompts, convertPromptToCommand, addKnownPrompt, runInTerminal } from "./utils";
import type { ShellBuddyArguments, CommandHistoryItem } from "./types";

export default function Command(props: { arguments: ShellBuddyArguments }) {
  const { prompt: defaultPrompt } = props.arguments;
  const [history, setHistory] = usePersistentState<CommandHistoryItem[] | undefined>("history", undefined);
  const [credits, setCredits] = usePersistentState<number>("credits", 1);
  const [prompt, setPrompt] = useState<string>(defaultPrompt ?? "");
  const [loading, setLoading] = useState<boolean>(false);

  const appendToHistory = (prompt: string, command: string) => {
    setHistory((prevState) => {
      if (prevState) {
        return [...prevState, { prompt, command }];
      }
      return [{ prompt, command }];
    });
  };

  const convertPrompt = async (prompt: string) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Converting Prompt" });
    setLoading(true);

    // not accepting extremely short prompts to save credits
    if (prompt.length < 2) {
      toast.style = Toast.Style.Failure;
      toast.title = "Error";
      toast.message = "Please enter a valid prompt";
      setLoading(false);
      return;
    }

    // assuming prompts will result in the same command regardless of casing
    const lowerCasePrompt = prompt.toLowerCase();
    const knownPrompts = await getKnownPrompts();
    const knownCommand = knownPrompts?.[lowerCasePrompt];

    // returning known prompts instead of using credits
    if (knownCommand) {
      appendToHistory(prompt, knownCommand);
      toast.style = Toast.Style.Success;
      toast.title = "Known prompt retrieved";
      toast.message = "No credit used";
      setLoading(false);
      return;
    }

    // convert natural language prompt to shell command
    const { success, command, title, message, remainingCredits } = await convertPromptToCommand(prompt);

    if (success) {
      setPrompt("");
      appendToHistory(prompt, command as string);
      setCredits(remainingCredits as number);
      await addKnownPrompt(lowerCasePrompt, command as string);
    } else {
      if (remainingCredits) {
        setCredits(remainingCredits);
      }
    }

    toast.style = success ? Toast.Style.Success : Toast.Style.Failure;
    toast.title = title;
    if (message) {
      toast.message = message;
    }

    setLoading(false);
  };

  const reverseHistory = useMemo<CommandHistoryItem[] | undefined>(
    () => (history === undefined ? history : [...history].reverse()),
    [history]
  );

  useEffect(() => {
    checkRemainingCredits().then((c) => {
      if (!c.success) {
        showToast({ style: Toast.Style.Failure, title: c.title });
      }
      setCredits(c.remainingCredits);
    });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line no-prototype-builtins
    if (defaultPrompt && defaultPrompt.length > 0) {
      convertPrompt(defaultPrompt);
    }
  }, [defaultPrompt]);

  return (
    <List
      enableFiltering={false}
      onSearchTextChange={setPrompt}
      searchBarPlaceholder="Create a new nextjs project"
      searchText={prompt}
      isLoading={loading}
      actions={
        <ActionPanel>
          {credits > 0 ? (
            <Action
              title={`Convert Prompt (${credits} credits left)`}
              icon={Icon.Lowercase}
              onAction={() => convertPrompt(prompt)}
            />
          ) : (
            <Action.OpenInBrowser title="Purchase more credits" url={creditsUrl} />
          )}
          <Action
            title="Enter New License Key"
            icon={Icon.Key}
            shortcut={{ modifiers: ["cmd"], key: "l" }}
            onAction={() => openCommandPreferences()}
          />
        </ActionPanel>
      }
    >
      <List.Section title="Command History">
        {loading && <List.Item title="Hang on, converting your prompt ..." icon={Icon.Terminal} subtitle={prompt} />}
        {reverseHistory?.map((p, i) => (
          <List.Item
            title={p.command}
            icon={Icon.Terminal}
            subtitle={p.prompt}
            key={i}
            actions={
              <ActionPanel title="Shell Buddy Actions">
                <ActionPanel.Section>
                  {credits > 0 ? (
                    <Action
                      title={`Convert Prompt (${credits} credits left)`}
                      icon={Icon.Lowercase}
                      onAction={() => convertPrompt(prompt)}
                    />
                  ) : (
                    <Action.OpenInBrowser title="Purchase more credits" url={creditsUrl} />
                  )}
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Execute in Terminal"
                    icon={Icon.Terminal}
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                    onAction={() => {
                      closeMainWindow();
                      runInTerminal(p.command);
                    }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Command to Clipboard"
                    content={p.command}
                    shortcut={{ modifiers: ["cmd"], key: "j" }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Enter New License Key"
                    icon={Icon.Key}
                    shortcut={{ modifiers: ["cmd"], key: "l" }}
                    onAction={() => openCommandPreferences()}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
