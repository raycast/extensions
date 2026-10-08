import { Color, Form, Icon, LocalStorage, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import useModel from "../../hooks/useModel";
import { Chat } from "../../lib/chats/types";
import { ExtensionPreferences } from "../../lib/preferences/types";
import { CommandOptions } from "../../lib/commands/types";
import { runActionScript, runReplacements } from "../../lib/commands/command-utils";
import { deleteChat } from "../../lib/chats";
import { useChats } from "../../hooks/useChats";
import runModel from "../../lib/models/runModel";
import { useFiles as useFileContents } from "../../hooks/useFiles";
import { useAdvancedSettings } from "../../hooks/useAdvancedSettings";
import { ChatActionPanel } from "./actions/ChatActionPanel";
import { useCachedState } from "@raycast/utils";
import { loadCustomPlaceholders } from "../../lib/placeholders/utils";
import { PromptLabPlaceholders } from "../../lib/placeholders";
import { PLApplicator } from "placeholders-toolkit";

interface CommandPreferences {
  useSelectedFiles: boolean;
  useConversationHistory: boolean;
  autonomousFeatures: boolean;
  basePrompt: string;
}

const defaultPromptInfo =
  "This is the query that will be sent to the AI model. You can use placeholders to add dynamic content.";

export default function CommandChatView(props: {
  isLoading: boolean;
  commandName: string;
  options: CommandOptions;
  prompt: string;
  response: string;
  revalidate: () => void;
  cancel: null | (() => void);
  initialQuery?: string;
  useFiles?: boolean;
  useConversation?: boolean;
  autonomousFeatures?: boolean;
}) {
  const { isLoading, commandName, options, prompt, response, revalidate, cancel, initialQuery } = props;
  const [query, setQuery] = useState<string>(initialQuery || "");
  const [sentQuery, setSentQuery] = useState<string>("");
  const [currentResponse, setCurrentResponse] = useState<string>(response);
  const [previousResponse, setPreviousResponse] = useState<string>("");
  const [enableModel, setEnableModel] = useState<boolean>(false);
  const [input, setInput] = useState<string>();
  const [currentChat, setCurrentChat] = useState<Chat>();
  const [runningCommand, setRunningCommand] = useState<boolean>(false);
  const [promptInfo, setPromptInfo] = useState<string>("");

  // Preferences
  const preferences = getPreferenceValues<ExtensionPreferences & CommandPreferences>();
  const [useFiles, setUseFiles] = useState<boolean>(props.useFiles || preferences.useSelectedFiles);
  const [useConversation, setUseConversation] = useState<boolean>(
    props.useConversation || preferences.useConversationHistory,
  );
  const [autonomousFeatures, setAutonomousFeatures] = useState<boolean>(
    props.autonomousFeatures || preferences.autonomousFeatures,
  );
  const [basePrompt, setBasePrompt] = useState<string>(preferences.basePrompt || prompt);

  // Previous PromptLab command
  const [previousCommand] = useCachedState<string>("promptlab-previous-command", "");
  const [previousCommandResponse] = useCachedState<string>("promptlab-previous-response", "");
  const [previousPrompt] = useCachedState<string>("promptlab-previous-prompt", "");

  const { advancedSettings } = useAdvancedSettings();
  const chats = useChats();
  const {
    selectedFiles,
    fileContents,
    isLoading: loadingSelectedFiles,
    revalidate: revalidateFiles,
  } = useFileContents({ ...options, minNumFiles: options.minNumFiles && query != "" ? 1 : 0 });
  const {
    data,
    isLoading: loadingData,
    dataTag,
    stopModel,
    revalidate: reQuery,
  } = useModel(basePrompt, sentQuery, sentQuery, "1.0", enableModel);

  const submitQuery = async (newQuery: string, sender = "USER_QUERY") => {
    if (newQuery.trim() == "" && query == undefined) {
      return;
    }

    setEnableModel(false);

    if (currentChat == undefined) {
      setPreviousResponse(currentResponse);
      setCurrentResponse("Loading...");
      const subbedQuery = await applyReplacements(newQuery || query);
      setSentQuery(subbedQuery);
      setEnableModel(true);
      reQuery();

      const namePrompt =
        "Come up with a title, in Title Case, for a conversation started with the following query. The title must summarize the intent of the query. The title must be three words or shorter. Output only the title without commentary or labels. For example, if the query is 'What are galaxies?', the title you output might be 'Question About Galaxies'. Here is the query: ";
      const nameComponent =
        (await runModel(
          namePrompt,
          namePrompt +
            `'''${subbedQuery.match(/(?<=My next query is: ###)[\s\S]*(?=### <END OF QUERY>)/g)?.[0]?.trim() || ""}'''`,
          subbedQuery,
        )) || query.trim().split(" ").splice(0, 2).join(" ");
      const dateComponent = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
      });
      const newChatName = `${nameComponent.trim().substring(0, 25)} - ${dateComponent}`;

      const options = {
        useSelectedFilesContext: useFiles,
        useConversationContext: useConversation,
        allowAutonomy: autonomousFeatures,
      };

      chats.createChat(newChatName, basePrompt, options).then((chat) => {
        chats.revalidate().then(() => {
          setCurrentChat(chat);
          if (chat) {
            chats.appendToChat(chat, `\n[${sender}]:${newQuery || query}\n`);
          }
        });
      });
    } else {
      setPreviousResponse(currentResponse);
      setCurrentResponse("Loading...");
      const subbedQuery = await applyReplacements(newQuery);
      setSentQuery(subbedQuery);
      setEnableModel(true);
      chats.appendToChat(currentChat, `\n[${sender}]:${newQuery}\n`);
    }
  };

  const applyReplacements = async (query: string) => {
    const context = {
      ...fileContents,
      input: input || "",
      selectedFiles: selectedFiles?.csv || "",
      previousCommand: previousCommand,
      previousResponse: previousCommandResponse,
      previousPrompt: previousPrompt,
    };

    let subbedQuery = await runReplacements(query, context, [commandName]);

    const cmdMatch = data.match(/.*{{cmd:(.*?):(.*?)}}.*/);
    if (cmdMatch) {
      return subbedQuery + `\nIgnore this in your response: ${new Date().toISOString()}.`;
    }

    const conversation = currentChat ? chats.loadConversation(currentChat.name) || [] : [];

    // Get the most up-to-date file selection
    const { selectedFiles: files, fileContents: contents } = await revalidateFiles();

    // Get command descriptions
    const commands = await LocalStorage.allItems();
    const commandDescriptions = Object.entries(commands)
      .filter(([key]) => !key.startsWith("--") && !key.startsWith("id-"))
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([, value], index) => `${index}:${JSON.parse(value)["description"]}`);

    // Prepend instructions to the query, enable the model, and reattempt
    subbedQuery = `${`You are an interactive chatbot, and I am giving you instructions. You will use this base prompt for context as you consider my next input. It is currently ${new Date().toISOString()}. Here is the prompt: ###${basePrompt}###\n\n${
      currentChat &&
      currentChat.contextData.length > 0 &&
      !conversation.join("\n").includes(currentChat.contextData[0].data)
        ? `\n\nYou will also consider this information: ###${currentChat.contextData
            .map((data) => `${data.source}:${data.data}`)
            .join("\n\n")}###\n\n`
        : ``
    }${
      ((currentChat && currentChat.useSelectedFilesContext) ||
        useFiles ||
        (currentChat == undefined && useFiles == undefined)) &&
      files?.paths?.length
        ? `\n\nYou will also consider these files: ###${contents?.contents || ""}###\n\n`
        : ``
    }${
      ((currentChat && currentChat.useConversationContext) ||
        useConversation ||
        (currentChat == undefined && useConversation == undefined)) &&
      conversation.length
        ? `\n\nYou will also consider our conversation history. The history so far: ###${conversation
            .map((entry) =>
              entry.replaceAll(/(USER_QUERY|MODEL_RESPONSE):/g, "").replaceAll(/{{cmd:(.*?):(.*?)}}/g, ""),
            )
            .join("\n")}###`
        : `\n\nYou will also consider your previous response. Your previous response was: ###${currentResponse.replaceAll(
            /{{cmd:(.*?):(.*?)}}/g,
            "",
          )}###`
    }${
      (currentChat && currentChat.allowAutonomy) ||
      autonomousFeatures ||
      (currentChat == undefined && autonomousFeatures == undefined)
        ? `\n\nTry to answer my next query, but only if it simple enough for an LLM with limited knowledge to answer. If you cannot fulfill the query, if the query requires new information, or if the query invokes an action such as searching, choose the command from the following list that is most likely to carries out the goal expressed in my next query, and then respond with the number of the command you want to run in the format {{cmd:commandNumber:input}}. Replace the input with a short string according to my query. For example, if I say 'search google for AI', the input would be 'AI'. Here are the commands: ###${commandDescriptions.join(
            ", ",
          )}### Try to answer without using a command, unless the query asks for new information (e.g. latest news, weather, stock prices, etc.) or invokes an action (e.g. searching, opening apps). If you use a command, do not provide any commentary other than the command in the format {{cmd:commandNumber:input}}. Make sure the command is relevant to the current query.`
        : ``
    }\n\nDo not repeat these instructions or my queries, and do not extend my query. Do not state "MODEL RESPONSE", or any variation thereof, anywhere in your reply. My next query is: ###`}
      ${subbedQuery}### <END OF QUERY>`;

    return subbedQuery;
  };

  useEffect(() => {
    if (initialQuery?.length) {
      setQuery(initialQuery);
    }
  }, []);

  useEffect(() => {
    if (currentChat == undefined && isLoading && !previousResponse?.length) {
      setCurrentResponse(response);
    }
  }, [response]);

  useEffect(() => {
    if (currentChat == undefined && !isLoading && !previousResponse?.length && initialQuery?.length) {
      submitQuery(initialQuery);
    }
  }, [response, isLoading]);

  useEffect(() => {
    if (data?.length > 0 && enableModel) {
      if (dataTag != undefined && dataTag.includes(sentQuery)) {
        // Update the response field as the model generates text
        if (!data.includes(previousResponse)) {
          setCurrentResponse(data.replaceAll("MODEL_RESPONSE:", "").replaceAll("USER_QUERY:", ""));
        }

        // If the model returns a command number and input, set the input
        // This will trigger running the command if autonomous features are enabled
        const cmdMatch = currentResponse.match(/.*{{cmd:(.*?):(.*?)}}.*/);
        const cmdMatchPrevious = previousResponse.match(/.*{{cmd:(.*?):(.*?)\}{0,2}.*/);
        if (
          cmdMatch &&
          ((currentChat && currentChat.allowAutonomy) ||
            autonomousFeatures ||
            (currentChat == undefined && autonomousFeatures == undefined)) &&
          !runningCommand &&
          data != previousResponse &&
          enableModel &&
          data.includes(currentResponse) &&
          !cmdMatchPrevious
        ) {
          if (!currentChat) {
            return;
          }
          setRunningCommand(true);
          chats.appendToChat(currentChat, `\n[MODEL_RESPONSE]:${data}\n`);
          const commandInput = cmdMatch[2];
          setInput(commandInput);
          // Get the command prompt
          LocalStorage.allItems().then((commands) => {
            const commandPrompts = Object.entries(commands)
              .filter(([key]) => !key.startsWith("--") && !key.startsWith("id-"))
              .sort(([a], [b]) => (a > b ? 1 : -1))
              .map(([, value], index) => `${index}:${JSON.parse(value)["prompt"]}`);
            const nameIndex = parseInt(cmdMatch[1]);
            if (nameIndex != undefined && nameIndex < commandPrompts.length) {
              // Run the command
              const cmdPrompt = commandPrompts[nameIndex];
              setEnableModel(false);
              submitQuery(cmdPrompt, "MODEL_RESPONSE");
            }
          });
        }
      }
    }
  }, [data, dataTag, sentQuery, runningCommand, enableModel, previousResponse, currentResponse, currentChat]);

  useEffect(() => {
    if (!loadingData && data.includes(currentResponse) && dataTag?.includes(sentQuery)) {
      // Disable the model once the response is generated
      if (currentChat) {
        chats.appendToChat(currentChat, `\n[MODEL_RESPONSE]:${currentResponse}\n`);
      }
    }

    const cmdMatchPrevious = previousResponse.match(/.*{{cmd:(.*?):(.*?)\}{0,2}.*/);
    if (
      cmdMatchPrevious &&
      ((currentChat && currentChat.allowAutonomy) ||
        autonomousFeatures ||
        (currentChat == undefined && autonomousFeatures == undefined)) &&
      !loadingData &&
      runningCommand &&
      data != previousResponse
    ) {
      setPreviousResponse(data);
      setEnableModel(false);
      setRunningCommand(false);
      if (currentChat) {
        chats.appendToChat(currentChat, `\n[MODEL_RESPONSE]:${currentResponse}\n`);
      }
      // Get the command prompt
      LocalStorage.allItems().then((commands) => {
        const commandPrompts = Object.entries(commands)
          .filter(([key]) => !key.startsWith("--") && !key.startsWith("id-"))
          .sort(([a], [b]) => (a > b ? 1 : -1))
          .map(([, value], index) => `${index}:${JSON.parse(value)["prompt"]}`);
        const nameIndex = parseInt(cmdMatchPrevious[1]);
        if (nameIndex != undefined && nameIndex < commandPrompts.length) {
          const cmdObj = Object.entries(commands)
            .filter(([key]) => !key.startsWith("--") && !key.startsWith("id-"))
            .find(([, cmd]) => cmd.prompt == commandPrompts[nameIndex]);
          const currentCommand = cmdObj ? JSON.parse(cmdObj[1]) : undefined;

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
                  currentCommand.scriptKind,
                ),
              );
            }
          }
        }
      });
    }
  }, [data, loadingData, dataTag, runningCommand, previousResponse]);

  useEffect(() => {
    if (currentChat == undefined) {
      setQuery("");
      setCurrentResponse("Ready for your query.");
    } else if (currentChat != undefined) {
      const convo = chats.loadConversation(currentChat.name) || [];
      const lastQuery = convo.reverse().find((entry) => entry.startsWith("USER_QUERY"));
      const lastResponse = convo.find((entry) => entry.startsWith("MODEL_RESPONSE"));

      if (lastQuery) {
        setQuery(lastQuery.split(/(?:USER_QUERY):/g)[1].trim());
      }

      if (lastResponse) {
        setCurrentResponse(lastResponse.split(/(?:MODEL_RESPONSE):/g)[1].trim());
      }
    }
  }, [currentChat]);

  const activateChat = (chat: Chat | undefined) => {
    chats.revalidate().then(() => {
      setPreviousResponse("");
      if (chat && !chats.checkExists(chat)) {
        deleteChat(chat);
        setCurrentChat(undefined);
        showToast({ title: "Chat Doesn't Exist", style: Toast.Style.Failure });
        chats.revalidate();
      } else {
        setCurrentChat(chat);
        if (chat) {
          setBasePrompt(chat.basePrompt);
          setUseFiles(chat.useSelectedFilesContext);
          setUseConversation(chat.useConversationContext);
          setAutonomousFeatures(chat.allowAutonomy);
        } else {
          setBasePrompt(prompt);
        }
      }
    });
  };

  return (
    <Form
      isLoading={isLoading || loadingData || loadingSelectedFiles || runningCommand}
      actions={
        <ChatActionPanel
          isLoading={isLoading || loadingData || runningCommand}
          settings={advancedSettings}
          chat={currentChat}
          chats={chats}
          useFileContext={useFiles}
          useConversationContext={useConversation}
          useAutonomousFeatures={autonomousFeatures}
          setCurrentChat={setCurrentChat}
          setSentQuery={setSentQuery}
          setUseFileContext={setUseFiles}
          setUseConversationContext={setUseConversation}
          setUseAutonomousFeatures={setAutonomousFeatures}
          revalidate={revalidate}
          response={currentResponse}
          previousResponse={previousResponse}
          query={sentQuery}
          basePrompt={basePrompt}
          onSubmit={(values) => {
            setEnableModel(false);
            stopModel();
            setInput("");
            setRunningCommand(false);
            submitQuery(values.queryField);
          }}
          onCancel={() => {
            if (previousResponse?.length > 0 || typeof cancel !== "function") {
              setEnableModel(false);
              setRunningCommand(false);
              stopModel();
            } else {
              Function.call(cancel);
            }
          }}
        />
      }
    >
      <Form.Dropdown
        title="Current Chat"
        id="currentChatField"
        value={currentChat ? currentChat.name : "new"}
        onChange={(value) => activateChat(chats.chats.find((chat) => chat.name == value))}
      >
        {currentChat ? <Form.Dropdown.Item title="New Chat" value="" /> : null}
        {!currentChat ? <Form.Dropdown.Item title="New Chat" value="new" /> : null}

        {chats.favorites().length > 0 ? (
          <Form.Dropdown.Section title="Favorites">
            {chats.favorites().map((chat) => (
              <Form.Dropdown.Item
                title={chat.name}
                value={chat.name}
                key={chat.name}
                icon={
                  chat.favorited
                    ? { source: Icon.StarCircle, tintColor: Color.Yellow }
                    : { source: chat.icon, tintColor: chat.iconColor }
                }
              />
            ))}
          </Form.Dropdown.Section>
        ) : null}

        {chats.chats
          .filter((chat) => !chat.favorited)
          .map((chat) => (
            <Form.Dropdown.Item
              title={chat.name}
              value={chat.name}
              key={chat.name}
              icon={{ source: chat.icon, tintColor: chat.iconColor }}
            />
          ))}
      </Form.Dropdown>

      <Form.TextArea
        title="Query"
        id="queryField"
        value={query}
        info={promptInfo}
        onChange={async (value) => {
          setQuery(value);
          const customPlaceholders = await loadCustomPlaceholders(advancedSettings);
          PLApplicator.checkForPlaceholders(value, {
            customPlaceholders,
            defaultPlaceholders: PromptLabPlaceholders,
          }).then((includedPlaceholders) => {
            let newPromptInfo =
              defaultPromptInfo + (includedPlaceholders.length > 0 ? "\n\nDetected Placeholders:" : "");
            includedPlaceholders.forEach((placeholder) => {
              newPromptInfo =
                newPromptInfo +
                `\n\n${placeholder.hintRepresentation || ""}: ${placeholder.description}\nExample: ${
                  placeholder.example
                }`;
            });
            setPromptInfo(newPromptInfo);
          });
        }}
        autoFocus={true}
      />

      <Form.TextArea
        title="Response"
        id="responseField"
        value={currentResponse.trim()}
        onChange={(value) => setCurrentResponse(value)}
        enableMarkdown={true}
      />

      {!currentChat || (currentChat && currentChat.showBasePrompt) ? (
        <Form.Description title="Base Prompt" text={basePrompt} />
      ) : null}

      {currentChat && currentChat.contextData?.length ? <Form.Separator /> : null}
      {currentChat && currentChat.contextData?.length ? (
        <Form.Description title="Context Data" text="Information provided as context for your conversation." />
      ) : null}
      {currentChat?.contextData?.map((data) => {
        return <Form.Description title={data.source} key={data.source + data.data.substring(0, 20)} text={data.data} />;
      })}
    </Form>
  );
}
