import { Action, ActionPanel, Form, Icon, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import useModel from "../utils/useModel";
import { Command, CommandOptions } from "../utils/types";
import { useFileContents } from "../utils/file-utils";
import { useReplacements } from "../hooks/useReplacements";
import { runActionScript, runReplacements } from "../utils/command-utils";

export default function CommandChatView(props: {
  isLoading: boolean;
  commandName: string;
  options: CommandOptions;
  prompt: string;
  response: string;
  revalidate: () => void;
  cancel: () => void;
  initialQuery?: string;
  useFiles?: boolean;
  useConversation?: boolean;
  autonomousFeatures?: boolean;
}) {
  const {
    isLoading,
    commandName,
    options,
    prompt,
    response,
    revalidate,
    cancel,
    initialQuery,
    useFiles,
    useConversation,
  } = props;
  const [query, setQuery] = useState<string>(initialQuery || "");
  const [sentQuery, setSentQuery] = useState<string>("");
  const [currentResponse, setCurrentResponse] = useState<string>(response);
  const [previousResponse, setPreviousResponse] = useState<string>("");
  const [enableModel, setEnableModel] = useState<boolean>(false);
  const [queryError, setQueryError] = useState<string>();
  const [conversation, setConversation] = useState<string[]>([prompt]);
  const [useAutonomousFeatures, setUseAutonomousFeatures] = useState<boolean>(props.autonomousFeatures || false);
  const [input, setInput] = useState<string>();
  const [currentCommand, setCurrentCommand] = useState<Command>();

  useEffect(() => {
    // If the initial query is not empty, run the query and start the conversation
    if (initialQuery?.length) {
      setPreviousResponse(response);
      setCurrentResponse("");
      setConversation([prompt, response]);
      setSentQuery(initialQuery);
      setEnableModel(true);
    }
  }, []);

  useEffect(() => {
    // Update the response field if the response from props changes
    setCurrentResponse(response);
  }, [response]);

  // Get files, set up prompt replacements, and run the model
  const {
    selectedFiles,
    contentPrompts,
    loading: contentIsLoading,
    revalidate: revalidateFiles,
  } = useFileContents(options);
  const replacements = useReplacements(input, selectedFiles);
  const {
    data,
    isLoading: loading,
    revalidate: reattempt,
  } = useModel(
    prompt,
    sentQuery,
    sentQuery,
    options.temperature == undefined ? "1.0" : options.temperature,
    enableModel
  );

  useEffect(() => {
    if (data.length > 0) {
      // Update the response field as the model generates text
      setCurrentResponse(data);
    }

    // If the model returns a command number and input, set the input
    // This will trigger running the command if autonomous features are enabled
    const cmdMatch = data.match(/.*{{cmd:(.*?):(.*?)}}.*/);
    if (cmdMatch && useAutonomousFeatures) {
      const commandInput = cmdMatch[2];
      setInput(commandInput);
    }
  }, [data]);

  useEffect(() => {
    if (input == undefined || !data.includes("}}")) {
      return;
    }

    // When the input changes, run specified command if autonomous features are enabled
    const cmdMatch = data.match(/.*{{cmd:(.*?):(.*?)}}.*/);
    if (cmdMatch && useAutonomousFeatures) {
      // Get the command prompt
      LocalStorage.allItems().then((commands) => {
        const commandPrompts = Object.entries(commands)
          .filter(([key]) => key != "--defaults-installed" && !key.startsWith("id-"))
          .sort(([a], [b]) => (a > b ? 1 : -1))
          .map(([, value], index) => `${index}:${JSON.parse(value)["prompt"]}`);
        const nameIndex = parseInt(cmdMatch[1]);
        if (nameIndex != undefined && nameIndex < commandPrompts.length) {
          // Run the command
          setCurrentResponse("");
          setEnableModel(false);
          const prompt = commandPrompts[nameIndex];
          runReplacements(prompt, replacements, []).then((subbedPrompt) => {
            // Run the model again
            setSentQuery(subbedPrompt);
            setEnableModel(true);
            setCurrentCommand(
              JSON.parse(
                Object.entries(commands)
                  .filter(([key]) => key != "--defaults-installed" && !key.startsWith("id-"))
                  .filter(([, cmd]) => cmd.prompt == undefined)[0][1]
              )
            );
          });
        }
      });
    }
  }, [input, data]);

  useEffect(() => {
    if (!loading && enableModel == true && currentResponse == data) {
      // Disable the model once the response is generated
      if (currentCommand != undefined) {
        if (
          currentCommand.actionScript != undefined &&
          currentCommand.actionScript.trim().length > 0 &&
          currentCommand.actionScript != "None"
        ) {
          Promise.resolve(
            runActionScript(
              currentCommand.actionScript,
              currentCommand.prompt,
              input || "",
              currentResponse,
              currentCommand.scriptKind
            )
          ).then(() => {
            setCurrentCommand(undefined);
          });
        }
      }
      setEnableModel(false);
    }
  }, [enableModel, loading, currentResponse, data, currentCommand, input]);

  return (
    <Form
      isLoading={isLoading || (loading && enableModel) || contentIsLoading}
      navigationTitle={commandName}
      actions={
        <ActionPanel>
          {isLoading || (loading && enableModel) ? (
            <Action
              title="Cancel"
              onAction={() => {
                previousResponse.length > 0 ? setEnableModel(false) : cancel();
              }}
            />
          ) : (
            <Action.SubmitForm
              title="Submit Query"
              onSubmit={async (values) => {
                // Ensure query is not empty
                if (!values.queryField.length) {
                  setQueryError("Query cannot be empty");
                  return;
                }
                setQueryError(undefined);

                // Store the previous response and clear the response field
                setPreviousResponse(values.responseField);
                setCurrentResponse("");

                // Log the conversation
                const convo = [...conversation];
                convo.push(values.responseField);
                convo.push(values.queryField);
                while (values.queryField + convo.join("\n").length > 3900) {
                  convo.shift();
                }
                setConversation(convo);

                // Get the most up-to-date file selection
                await (async () => {
                  revalidateFiles();
                  if (!contentIsLoading) {
                    return true;
                  }
                });

                // Get command descriptions
                const commands = await LocalStorage.allItems();
                const commandDescriptions = Object.entries(commands)
                  .filter(([key]) => key != "--defaults-installed" && !key.startsWith("id-"))
                  .sort(([a], [b]) => (a > b ? 1 : -1))
                  .map(([, value], index) => `${index}:${JSON.parse(value)["description"]}`);

                // Prepend instructions to the query, enable the model, and reattempt
                const subbedPrompt = await runReplacements(values.queryField, replacements, []);
                setSentQuery(
                  `${
                    values.responseField.length > 0
                      ? `You are an interactive chatbot, and I am giving you instructions. You will use this base prompt for context as you consider my next input. Here is the prompt: ###${prompt}###\n\n${
                          values.useFilesCheckbox && selectedFiles?.length
                            ? ` You will also consider the following details about selected files. Here are the file details: ###${contentPrompts.join(
                                "\n"
                              )}###\n\n`
                            : ``
                        }${
                          values.useConversationCheckbox
                            ? `You will also consider our conversation history. The history so far: ###${conversation.join(
                                "\n"
                              )}###`
                            : `You will also consider your previous response. Your previous response was: ###${values.responseField}###`
                        }${
                          values.useAICommandsCheckbox
                            ? `Try to answer my next query using your knowledge. If you cannot fulfill the query, if the query requires new information, or if the query invokes an action such as searching, choose the command from the following list that is most likely to carries out the goal expressed in my next query, and then respond with the number of the command you want to run in the format {{cmd:commandNumber:input}}. Replace the input with a short string according to my query. For example, if I say 'search google for AI', the input would be 'AI'. Here are the commands: ###${commandDescriptions.join(
                                "\n"
                              )}### Try to answer without using a command, unless the query asks for new information (e.g. latest news, weather, stock prices, etc.) or invokes an action (e.g. searching, opening apps). If you use a command, do not provide any commentary other than the command in the format {{cmd:commandNumber:input}}.`
                            : ``
                        }\n\nMy next query is: ###`
                      : ""
                  }
                  ${subbedPrompt}###`
                );
                setEnableModel(true);
                reattempt();
              }}
            />
          )}

          <Action
            title="Regenerate"
            icon={Icon.ArrowClockwise}
            onAction={previousResponse.length > 0 ? reattempt : revalidate}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />

          <ActionPanel.Section title="Clipboard Actions">
            <Action.CopyToClipboard
              title="Copy Response"
              content={currentResponse}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Previous Response"
              content={previousResponse}
              shortcut={{ modifiers: ["cmd", "opt"], key: "p" }}
            />
            <Action.CopyToClipboard
              title="Copy Sent Prompt"
              content={sentQuery}
              shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
            />
            <Action.CopyToClipboard
              title="Copy Base Prompt"
              content={prompt}
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="queryField"
        title="Query"
        value={query || ""}
        onChange={(value) => setQuery(value)}
        error={queryError}
        autoFocus={true}
      />

      <Form.Description title="" text="Tip: You can use placeholders in your query." />

      <Form.TextArea id="responseField" title="Response" value={currentResponse.trim()} onChange={() => null} />

      <Form.Checkbox
        label="Use Selected Files As Context"
        id="useFilesCheckbox"
        defaultValue={useFiles == undefined ? false : useFiles}
      />

      <Form.Checkbox
        label="Use Conversation As Context"
        id="useConversationCheckbox"
        defaultValue={useConversation == undefined ? true : useConversation}
      />

      <Form.Checkbox
        label="Allow AI To Run Commands (Experimental)"
        id="useAICommandsCheckbox"
        value={useAutonomousFeatures}
        onChange={(value) => setUseAutonomousFeatures(value)}
      />

      <Form.Description title="Base Prompt" text={prompt} />
    </Form>
  );
}
