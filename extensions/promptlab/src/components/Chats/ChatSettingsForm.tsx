import { Action, ActionPanel, Form, showToast, Icon, useNavigation, Color, environment, Toast } from "@raycast/api";
import { Chat, ChatManager, ChatStatistics } from "../../lib/chats/types";
import { useEffect, useState } from "react";
import { filterString } from "../../lib/context-utils";
import runModel from "../../lib/models/runModel";
import { getFileContent } from "../../hooks/useFiles";
import { AdvancedActionSubmenu } from "../actions/AdvancedActionSubmenu";
import { defaultAdvancedSettings } from "../../data/default-advanced-settings";
import { utils } from "placeholders-toolkit";
import { updateChat } from "../../lib/chats";

interface ChatSettingsFormValues {
  chatNameField: string;
  chatIconField: string;
  chatIconColorField: string;
  chatBasePromptField: string;
  chatFavoritedField: boolean;
  [key: string]: string[] | string | boolean;
  chatCondensingStrategyField: string;
  chatSummaryLengthField: string;
  chatShowBasePromptField: boolean;
  chatUseSelectedFilesContextField: boolean;
  chatUseConversationContextField: boolean;
  chatAllowAutonomyField: boolean;
}

const statNames: { [key: string]: string } = {
  totalQueries: "Total Queries",
  totalResponses: "Total Responses",
  totalPlaceholdersUsedByUser: "Placeholders Used By User",
  totalCommandsRunByAI: "Commands Run By AI",
  mostCommonQueryWords: "Frequent Query Words",
  mostCommonResponseWords: "Frequent Response Words",
  totalLengthOfContextData: "Context Length",
  lengthOfBasePrompt: "Base Prompt Length",
  averageQueryLength: "Average Query Length",
  averageResponseLength: "Average Response Length",
  mostUsedPlaceholder: "Most Used Placeholder",
  mostUsedCommand: "Most Used Command",
  mostUsedEmojis: "Most Used Emojis",
};

export default function ChatSettingsForm(props: {
  oldData: Chat;
  chats: ChatManager;
  setCurrentChat: React.Dispatch<React.SetStateAction<Chat | undefined>>;
  settings: typeof defaultAdvancedSettings;
}) {
  const { oldData, chats, setCurrentChat, settings } = props;
  const [contextFields, setContextFields] = useState<{ type: string; source: string; data: string }[]>([
    ...oldData.contextData,
  ]);
  const [stats, setStats] = useState<ChatStatistics>();
  const { pop } = useNavigation();

  useEffect(() => {
    setStats(chats.calculateStats(oldData.name));
  }, [contextFields]);

  return (
    <Form
      navigationTitle="Chat Settings"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Chat Settings"
            onSubmit={async (values: ChatSettingsFormValues) => {
              const toast = await showToast({
                title: "Saving Chat Settings",
                message: "This could take a minute...",
                style: Toast.Style.Animated,
              });

              const filledContextFields = [...contextFields.map((field) => ({ ...field }))];
              for (let i = 0; i < contextFields.length; i++) {
                const contextField = contextFields[i];
                const contextDataFieldRaw = values[`contextDataField${i}`];
                const contextDataField = Array.isArray(contextDataFieldRaw)
                  ? (contextDataFieldRaw.join(", ") as string)
                  : (contextDataFieldRaw as string);
                if (contextDataField.length) {
                  if (oldData && oldData.contextData.length > i && oldData.contextData[i].source == contextDataField) {
                    // If the context data field hasn't changed, don't re-summarize it
                    continue;
                  }

                  if (
                    values.chatCondensingStrategyField == "summarize" ||
                    values.chatCondensingStrategyField == "summarizeParagraphs"
                  ) {
                    toast.message = `Summarizing ${contextDataField}...`;
                  } else if (
                    values.chatCondensingStrategyField == "condenseIntelligently" ||
                    values.chatCondensingStrategyField == "condenseRandomly"
                  ) {
                    toast.message = `Condensing ${contextDataField}...`;
                  }

                  if (values.chatCondensingStrategyField == "condenseRandomly") {
                    let condensedText = "";
                    switch (contextField.type) {
                      case "website": {
                        condensedText = filterString(await utils.getTextOfWebpage(contextDataField));
                        while (condensedText.length > parseInt(values.chatSummaryLengthField)) {
                          const randomIndex = Math.floor(Math.random() * condensedText.length);
                          condensedText = condensedText.slice(0, randomIndex) + condensedText.slice(randomIndex + 1);
                        }
                        break;
                      }
                      case "file": {
                        const files = contextDataField.split(", ");
                        let fileText = "";
                        for (const file of files) {
                          fileText += "\n\n" + ((await getFileContent(file)).contents || "");
                        }

                        while (fileText.length > parseInt(values.chatSummaryLengthField) * files.length) {
                          const randomIndex = Math.floor(Math.random() * fileText.length);
                          fileText = fileText.slice(0, randomIndex) + fileText.slice(randomIndex + 1);
                        }
                        condensedText = fileText;
                        break;
                      }
                      case "text": {
                        condensedText = contextDataField;
                        while (condensedText.length > parseInt(values.chatSummaryLengthField)) {
                          const randomIndex = Math.floor(Math.random() * condensedText.length);
                          condensedText = condensedText.slice(0, randomIndex) + condensedText.slice(randomIndex + 1);
                        }
                      }
                    }
                    filledContextFields[i].source = contextDataField;
                    filledContextFields[i].data = condensedText.trim();
                  } else if (values.chatCondensingStrategyField == "selectLinesRandomly") {
                    let lines: string[] = [];
                    switch (contextField.type) {
                      case "website": {
                        lines = filterString(await utils.getTextOfWebpage(contextDataField)).split("\n");
                        while (lines.length > parseInt(values.chatSummaryLengthField)) {
                          const randomIndex = Math.floor(Math.random() * lines.length);
                          lines = [...lines.slice(0, randomIndex), ...lines.slice(randomIndex + 1)];
                        }
                        break;
                      }
                      case "file": {
                        const files = contextDataField.split(", ");
                        let fileText = "";
                        for (const file of files) {
                          fileText += "\n\n" + ((await getFileContent(file)).contents || "");
                        }

                        lines = fileText.split("\n");
                        while (lines.length > parseInt(values.chatSummaryLengthField)) {
                          const randomIndex = Math.floor(Math.random() * lines.length);
                          lines = [...lines.slice(0, randomIndex), ...lines.slice(randomIndex + 1)];
                        }
                        break;
                      }
                      case "text": {
                        lines = contextDataField.split("\n");
                        while (lines.length > parseInt(values.chatSummaryLengthField)) {
                          const randomIndex = Math.floor(Math.random() * lines.length);
                          lines = [...lines.slice(0, randomIndex), ...lines.slice(randomIndex + 1)];
                        }
                      }
                    }
                    filledContextFields[i].source = contextDataField;
                    filledContextFields[i].data = lines.join("\n").trim();
                  } else {
                    let prompt = "";
                    switch (contextField.type) {
                      case "website": {
                        const websiteText = filterString(await utils.getTextOfWebpage(contextDataField));
                        if (values.chatCondensingStrategyField == "summarize") {
                          prompt = `Summarize the following text of ${contextDataField} in 50 words or fewer: ###${websiteText}###`;
                        } else if (values.chatCondensingStrategyField == "summarizeParagraphs") {
                          prompt = `Summarize each paragraph of the following text of ${contextDataField} in 50 words or fewer. Output all of the paragraphs. Here is the text: ###${websiteText}###`;
                        } else if (values.chatCondensingStrategyField == "condenseIntelligently") {
                          prompt = `Condense the following text of ${contextDataField} to be 50 words or shorter. ###${websiteText}###`;
                        }
                        break;
                      }
                      case "file": {
                        const files = contextDataField.split(", ");
                        let fileText = "";
                        for (const file of files) {
                          fileText += "\n\n" + ((await getFileContent(file)).contents || "");
                        }
                        if (values.chatCondensingStrategyField == "summarize") {
                          prompt = `What ${
                            files.length == 1 ? "is this file" : "are these files"
                          } about, based on the information below? Answer in ${
                            files.length * 100
                          } words or fewer. Focus on the meaning, significance, and relevant details described. Attempt to extract insights and make inferences. ###${fileText}###`;
                        } else if (values.chatCondensingStrategyField == "summarizeParagraphs") {
                          prompt = `Summarize each paragraph of the following ${
                            files.length == 1 ? "file" : "files"
                          } in 50 words or fewer. Output each of the paragraphs. Here are the texts: ###${fileText}###`;
                        } else if (values.chatCondensingStrategyField == "condenseIntelligently") {
                          prompt = `Condense the following ${
                            files.length == 1 ? "file" : "files"
                          } to be 50 words or shorter. ###${fileText}###`;
                        }
                        break;
                      }
                      case "text": {
                        if (values.chatCondensingStrategyField == "summarize") {
                          prompt = `Summarize the following text in 50 words or fewer: ###${filterString(
                            contextDataField,
                          )}###`;
                        } else if (values.chatCondensingStrategyField == "summarizeParagraphs") {
                          prompt = `Summarize each paragraph of the following text in 50 words or fewer. Output all of the paragraphs. Here is the text: ###${filterString(
                            contextDataField,
                          )}###`;
                        } else if (values.chatCondensingStrategyField == "condenseIntelligently") {
                          prompt = `Condense the following text to be 50 words or shorter. ###${filterString(
                            contextDataField,
                          )}###`;
                        }
                        break;
                      }
                    }

                    prompt = filterString(prompt);
                    const condensedText = await runModel(prompt, prompt, "");
                    filledContextFields[i].source = contextDataField;

                    if (condensedText) {
                      filledContextFields[i].data = condensedText.trim();
                    } else {
                      await showToast({
                        title: "Error Summarizing Context",
                        message: "Please try again.",
                        style: Toast.Style.Failure,
                      });
                    }
                  }
                } else {
                  filledContextFields[i].data = "";
                }
              }

              const newChat: Chat = {
                name: values.chatNameField,
                icon: values.chatIconField,
                iconColor: values.chatIconColorField,
                basePrompt: values.chatBasePromptField,
                favorited: values.chatFavoritedField,
                contextData: filledContextFields.filter((field) => field.data.length > 0),
                condensingStrategy: values.chatCondensingStrategyField,
                summaryLength: values.chatSummaryLengthField,
                showBasePrompt: values.chatShowBasePromptField,
                useSelectedFilesContext: values.chatUseSelectedFilesContextField,
                useConversationContext: values.chatUseConversationContextField,
                allowAutonomy: values.chatAllowAutonomyField,
              };

              updateChat(oldData, newChat);

              chats.revalidate().then(() => {
                setCurrentChat(newChat);

                toast.title = "Chat Settings Saved";
                toast.message = "";
                toast.style = Toast.Style.Success;

                pop();
              });
            }}
          />
          <Action
            title="Add Website Context"
            icon={Icon.Globe}
            onAction={() => {
              setContextFields([...contextFields, { type: "website", source: "", data: "" }]);
            }}
          />
          <Action
            title="Add Files/Folders Context"
            icon={Icon.NewDocument}
            onAction={() => {
              setContextFields([...contextFields, { type: "file", source: "", data: "" }]);
            }}
          />
          <Action
            title="Add Text Context"
            icon={Icon.TextInput}
            onAction={() => {
              setContextFields([...contextFields, { type: "text", source: "", data: "" }]);
            }}
          />
          {contextFields.length > 0 ? (
            <ActionPanel.Section title="Context Removal">
              {contextFields.map((field, index) => (
                <Action
                  title={`Remove Context ${index + 1}`}
                  icon={Icon.DeleteDocument}
                  key={`removeAction${index}`}
                  onAction={() => {
                    setContextFields(contextFields.filter((_, i) => i != index));
                  }}
                />
              ))}
            </ActionPanel.Section>
          ) : null}
          <AdvancedActionSubmenu settings={settings} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Chat Name"
        placeholder="Name for this chat"
        defaultValue={oldData ? oldData.name : ""}
        id="chatNameField"
      />

      <Form.Dropdown title="Icon" defaultValue={oldData ? oldData.icon : undefined} id="chatIconField">
        {Object.keys(Icon).map((iconName, index) => (
          <Form.Dropdown.Item
            title={iconName}
            value={Object.values(Icon)[index]}
            key={iconName}
            icon={Object.values(Icon)[index]}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown title="Icon Color" defaultValue={oldData ? oldData.iconColor : undefined} id="chatIconColorField">
        <Form.Dropdown.Item
          title={environment.theme == "dark" ? "White" : "Black"}
          value={Color.PrimaryText}
          icon={{ source: Icon.CircleFilled, tintColor: Color.PrimaryText }}
        />
        <Form.Dropdown.Item title="Red" value={Color.Red} icon={{ source: Icon.CircleFilled, tintColor: Color.Red }} />
        <Form.Dropdown.Item
          title="Orange"
          value={Color.Orange}
          icon={{ source: Icon.CircleFilled, tintColor: Color.Orange }}
        />
        <Form.Dropdown.Item
          title="Yellow"
          value={Color.Yellow}
          icon={{ source: Icon.CircleFilled, tintColor: Color.Yellow }}
        />
        <Form.Dropdown.Item
          title="Green"
          value={Color.Green}
          icon={{ source: Icon.CircleFilled, tintColor: Color.Green }}
        />
        <Form.Dropdown.Item
          title="Blue"
          value={Color.Blue}
          icon={{ source: Icon.CircleFilled, tintColor: Color.Blue }}
        />
        <Form.Dropdown.Item
          title="Purple"
          value={Color.Purple}
          icon={{ source: Icon.CircleFilled, tintColor: Color.Purple }}
        />
        <Form.Dropdown.Item
          title="Magenta"
          value={Color.Magenta}
          icon={{ source: Icon.CircleFilled, tintColor: Color.Magenta }}
        />
      </Form.Dropdown>

      <Form.TextArea
        title="Base Prompt"
        placeholder="Context prompt for all queries"
        info="A context prompt provided to the model endpoint alongside all queries. This maintains context throughout the conversation."
        defaultValue={oldData ? oldData.basePrompt : ""}
        id="chatBasePromptField"
      />

      <Form.Checkbox label="Favorite" defaultValue={oldData ? oldData.favorited : false} id="chatFavoritedField" />

      <Form.Separator />

      <Form.Checkbox
        title="Features"
        label="Display Base Prompt"
        defaultValue={oldData ? oldData.showBasePrompt : true}
        id="chatShowBasePromptField"
        info="Whether to display the base prompt in the chat view."
      />

      <Form.Checkbox
        label="Use Selected Files/Folders As Context"
        defaultValue={oldData ? oldData.useSelectedFilesContext : false}
        id="chatUseSelectedFilesContextField"
        info="Whether to use the selected files/folders as context for the chat. If enabled, the contents and metadata of selected files will be injected into the conversation alongside your queries."
      />

      <Form.Checkbox
        label="Use Conversation History As Context"
        defaultValue={oldData ? oldData.useConversationContext : true}
        id="chatUseConversationContextField"
        info="Whether to use the conversation history as context for the chat. If enabled, previous queries and responses will be included alongside your current query, allowing for a chat-like experience."
      />

      <Form.Checkbox
        label="Allow AI to Run PromptLab Commands"
        defaultValue={oldData ? oldData.allowAutonomy : false}
        id="chatAllowAutonomyField"
        info="Whether to allow the model to act autonomously, running PromptLab commands as needed to respond to queries."
      />

      <Form.Separator />

      <Form.Description
        title="Context Data"
        text="Context data is always maintained in the conversation history. The data is minimize such that it fits within the configured token limit. To add context data, use one of the actions from the Actions menu to add additional fields to this form."
      />

      <Form.Dropdown
        title="Condensing Strategy"
        defaultValue={oldData ? oldData.condensingStrategy : "summarize"}
        id="chatCondensingStrategyField"
      >
        <Form.Dropdown.Item title="Summarize Document" value="summarize" />
        <Form.Dropdown.Item title="Summarize Paragraphs" value="summarizeParagraphs" />
        <Form.Dropdown.Item title="Condense Intelligently" value="condenseIntelligently" />
        <Form.Dropdown.Item title="Condense Randomly" value="condenseRandomly" />
        <Form.Dropdown.Item title="Select Lines Intelligently" value="selectLinesIntelligently" />
        <Form.Dropdown.Item title="Select Lines Randomly" value="selectLinesRandomly" />
      </Form.Dropdown>

      <Form.TextField
        title="Summary Length"
        placeholder="Length of the summary"
        info="The target length of summaries to generate for each context data field. This is an approximate length, and the actual length may vary."
        defaultValue={
          oldData.summaryLength != undefined && oldData.summaryLength.length ? oldData.summaryLength : "100"
        }
        id="chatSummaryLengthField"
      />

      {contextFields.map((field, index) => {
        switch (field.type) {
          case "website":
            return (
              <Form.TextField
                title={`Context ${index + 1}, Website URL`}
                id={`contextDataField${index}`}
                key={`contextDataField${index}`}
                placeholder="https://www.example.com"
                info="The URL of the website to use as context. A summary of the URL, title, and text of the website will be used as the context data."
                value={field.source}
                onChange={(newValue) => {
                  const newContextFields = [...contextFields];
                  newContextFields[index].source = newValue;
                  setContextFields(newContextFields);
                }}
              />
            );
          case "file":
            return (
              <Form.FilePicker
                title={`Context ${index + 1}, Files/Folders`}
                id={`contextDataField${index}`}
                key={`contextDataField${index}`}
                allowMultipleSelection={false}
                canChooseDirectories={true}
                info="The path to a file or folder to use as context. A summary of the file's content (including image vision information) and its metadata will be used as the context data."
                value={field.source.split(", ")}
                onChange={(newValue) => {
                  const newContextFields = [...contextFields];
                  newContextFields[index].source = newValue.join(", ");
                  setContextFields(newContextFields);
                }}
              />
            );
          case "text":
            return (
              <Form.TextField
                title={`Context ${index + 1}, Text`}
                id={`contextDataField${index}`}
                key={`contextDataField${index}`}
                placeholder="Some text"
                info="Raw text to use as context data. This will be summarized and used as the context data."
                value={field.source}
                onChange={(newValue) => {
                  const newContextFields = [...contextFields];
                  newContextFields[index].source = newValue;
                  setContextFields(newContextFields);
                }}
              />
            );
        }
      })}

      <Form.Separator />

      {stats ? <Form.Description title="Statistics" text="Various information about this chat." /> : null}
      {stats
        ? Object.entries(stats).map(([key, value]) =>
            value.length == 0 || value == "None" ? null : (
              <Form.Description
                title={statNames[key]}
                text={Array.isArray(value) ? value.map((entry, index) => `${index + 1}. ${entry}`).join("\n") : value}
                key={statNames[key]}
              />
            ),
          )
        : null}
    </Form>
  );
}
