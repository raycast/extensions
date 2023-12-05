import { OllamaApiTags } from "./api/ollama";
import * as React from "react";
import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";

const DeepLink = new Map([
  ["🔧 Command", "raycast://extensions/massimiliano_pasquini/raycast-ollama/ollama-custom-command"],
]);

export default function Command(): JSX.Element {
  const [availableModels, setAvailableModels]: [string[], React.Dispatch<React.SetStateAction<string[]>>] =
    React.useState([] as string[]);
  const [CommandType, setCommandType]: [string, React.Dispatch<React.SetStateAction<string>>] = React.useState("");
  const [Model, setModel]: [string, React.Dispatch<React.SetStateAction<string>>] = React.useState("");
  const [CreateQuicklinkEnabled, setCreateQuicklinkEnabled]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] =
    React.useState(false);

  async function fetchAvailableModels(): Promise<void> {
    await OllamaApiTags()
      .then((data) => {
        const models: string[] = [] as string[];
        data.models.forEach((row) => {
          models.push(row.name);
        });
        setAvailableModels([...models]);
        setCreateQuicklinkEnabled(true);
      })
      .catch(async (err) => await showToast({ style: Toast.Style.Failure, title: err.message }));
  }

  function onDropdownChangeCommandType(text: string): void {
    setCommandType(text);
  }

  function onDropdownChangeModel(text: string): void {
    setModel(text);
  }

  React.useEffect(() => {
    fetchAvailableModels();
  }, []);

  return (
    <Form
      actions={
        <ActionPanel>
          {CreateQuicklinkEnabled && (
            <Action.CreateQuicklink
              quicklink={{
                link: `${DeepLink.get(CommandType)}?arguments=${encodeURIComponent(JSON.stringify({ model: Model }))}`,
              }}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.Dropdown id="CommandType" title="Command Type" onChange={onDropdownChangeCommandType}>
        {Array.from(DeepLink).map((item) => {
          return <Form.Dropdown.Item key={item[0]} title={item[0]} value={item[0]} />;
        })}
      </Form.Dropdown>
      <Form.Dropdown id="Model" title="Model" onChange={onDropdownChangeModel}>
        {availableModels.map((item) => {
          return <Form.Dropdown.Item key={item} title={item} value={item} />;
        })}
      </Form.Dropdown>
    </Form>
  );
}
