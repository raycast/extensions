import { CustomCommand, getCustomCommands, setCustomCommands } from "./helpers/customCommands.jsx";
import { useEffect, useState } from "react";
import { Form, List, Action, ActionPanel, Icon, useNavigation, confirmAlert } from "@raycast/api";
import useGPT from "./api/gpt.jsx";
import { help_action } from "./helpers/helpPage.jsx";

export default function CustomAICommands() {
  let [commands, setCommands] = useState(null);
  useEffect(() => {
    (async () => {
      const retrieved = await getCustomCommands();
      setCommands(retrieved);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      await setCustomCommands(commands);
    })();
  }, [commands]);

  const EditCommandForm = (props) => {
    const { pop } = useNavigation();

    if (props.props) props = props.props; // wow

    const idx = props.idx ?? 0;
    const newCommand = props.newCommand || false;
    let command = newCommand ? new CustomCommand({ name: "New Command" }) : commands[idx];

    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Save"
              onSubmit={async (values) => {
                command.name = values.name;
                command.prompt = values.prompt;
                command.options.webSearch = values.webSearch;
                command.options.allowUploadFiles = values.allowUploadFiles;

                if (newCommand) {
                  setCommands([...commands, command]);
                } else {
                  const newCommands = commands.map((x, i) => (i === idx ? command : x));
                  setCommands(newCommands);
                }
                pop();
              }}
            />
            {help_action("customAICommands")}
          </ActionPanel>
        }
      >
        <Form.TextField id="name" title="Name" defaultValue={command.name} />
        <Form.TextArea id="prompt" title="Prompt" defaultValue={command.prompt} />
        <Form.Description
          title=""
          text="In the prompt, you can use dynamic placeholders like {input}, {clipboard} or {date}. Learn more by selecting the Help action."
        />

        <Form.Separator />

        <Form.Checkbox
          id="webSearch"
          title="Options"
          label="Enable Web Search"
          defaultValue={command.options?.webSearch}
        />
        <Form.Checkbox
          id="allowUploadFiles"
          label="Allow File Uploads"
          info="Only certain providers support file uploads, please refer to the README for more info"
          defaultValue={command.options?.allowUploadFiles}
        />
      </Form>
    );
  };

  const CommandActionPanel = (props) => {
    return (
      <ActionPanel>
        <Action.Push title="Run Command" icon={Icon.Play} target={<RunCommand command={commands[props.idx]} />} />
        <Action.Push title="Edit Command" icon={Icon.TextCursor} target={<EditCommandForm props={props} />} />
        <Action.Push
          title="Create Command"
          icon={Icon.PlusCircle}
          target={<EditCommandForm newCommand={true} />}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
        />
        <Action
          title="Delete Command"
          icon={Icon.Trash}
          onAction={async () => {
            await confirmAlert({
              title: "Are you sure?",
              message: "You cannot recover this command.",
              icon: Icon.Trash,
              primaryAction: {
                title: "Delete Command Forever",
                style: Action.Style.Destructive,
                onAction: () => {
                  const newCommands = commands.filter((x, idx) => idx !== props.idx);
                  setCommands(newCommands);
                },
              },
            });
          }}
          shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
          style={Action.Style.Destructive}
        />
        {help_action("customAICommands")}
      </ActionPanel>
    );
  };

  const commandsToListItems = (commands) => {
    return commands.map((x, idx) => {
      return <List.Item title={x.name} subtitle={x.prompt} key={x.id} actions={<CommandActionPanel idx={idx} />} />;
    });
  };

  const RunCommand = (props) => {
    const command = props.command;
    return useGPT(
      {},
      {
        showFormText: "Input",
        useSelected: true,
        allowUploadFiles: command.options?.allowUploadFiles,
        processPrompt: command.processPromptFunction(),
        webSearchMode: command.options?.webSearch ? "always" : "off",
      }
    );
  };

  // We show a list of commands
  if (!commands || commands.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Layers}
          title="Start by creating a custom command..."
          actions={
            <ActionPanel>
              <Action.Push
                title="Create Command"
                icon={Icon.PlusCircle}
                target={<EditCommandForm newCommand={true} />}
              />
              {help_action("customAICommands")}
            </ActionPanel>
          }
        />
      </List>
    );
  } else return <List searchBarPlaceholder="Search Custom Commands">{commandsToListItems(commands)}</List>;
}
