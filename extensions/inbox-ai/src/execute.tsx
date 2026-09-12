import { LaunchProps, Form, ActionPanel, Action, open, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import ActionList from "./components/ActionList";
import { SavedAction } from "./actions";
import { checkInboxAIInstallation } from "./utils/checkInstall";
interface CommandContext {
  actionId?: string;
  variables?: Record<string, string>;
}

export default function Command(props: LaunchProps<{ launchContext: CommandContext }>) {
  checkInboxAIInstallation();
  const [showTextForm, setShowTextForm] = useState(false);
  const [selectedAction, setSelectedAction] = useState<SavedAction | null>(null);
  const [formParams] = useState<Record<string, string>>({});

  const handleActionSelect = async (action: SavedAction) => {
    setSelectedAction(action);
    setShowTextForm(true);
    return false; // Prevent default URL opening
  };

  const handleSubmit = async (values: Record<string, string>) => {
    if (!selectedAction) return;

    const params = new URLSearchParams();
    params.append("action", selectedAction.id);

    // Add all form values as parameters
    Object.entries(values).forEach(([key, value]) => {
      if (typeof value === "string" && value.trim() !== "") {
        if (key === "text") {
          params.append("originalInput", value);
        } else {
          params.append(key, value);
        }
      }
    });

    const url = `inboxai://execute?${params.toString()}`;
    try {
      await open(url);
      setShowTextForm(false);
      return true;
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to launch Inbox AI. Is it installed?",
      });
      return false;
    }
  };

  if (showTextForm && selectedAction) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
          </ActionPanel>
        }
      >
        <Form.TextArea
          id="text"
          title="Input"
          placeholder="The input for the AI action"
          enableMarkdown={false}
          autoFocus
        />
        {selectedAction.variables
          .filter((v) => v.ai)
          .map((variable) => (
            <Form.TextField
              key={variable.id}
              id={variable.id}
              title={variable.label}
              placeholder={variable.description}
              defaultValue={variable.value}
            />
          ))}
      </Form>
    );
  }

  return (
    <ActionList
      commandName="execute"
      supportedTypes={["askAI"]}
      urlScheme="execute"
      launchContext={props.launchContext}
      onActionSelect={handleActionSelect}
      extraUrlParams={formParams}
    />
  );
}
