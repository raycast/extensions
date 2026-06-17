import {
  ActionPanel,
  List,
  Action,
  closeMainWindow,
  getSelectedText,
  showInFinder,
  popToRoot,
  Form,
  open,
  Icon,
} from "@raycast/api";
import { getScripts, Script, runScript } from "./utilities/jsa";
import { useCallback, useEffect, useState } from "react";
import checkForInstallation from "./utilities/checkForInstallation";

interface FormValues {
  input: string;
}

async function resetRaycast() {
  await closeMainWindow({ clearRootSearch: true });
  popToRoot();
}

function InputForm(props: { script: Script }) {
  const { script } = props;
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={async (values: FormValues) => {
              const input = values.input;
              await runScript(script.id, input);
              await resetRaycast();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea id="input" title="Input" placeholder="Input you want to pass to the script" />
    </Form>
  );
}

function ScriptItem(props: { script: Script }) {
  const { script } = props;
  return (
    <List.Item
      key={script.id}
      actions={
        <ActionPanel>
          <Action
            title="Run"
            icon={Icon.Play}
            onAction={async () => {
              await runScript(script.id);
              await resetRaycast();
            }}
          />
          <Action
            title="Show Script File in Finder"
            icon={Icon.Finder}
            onAction={async () => {
              await showInFinder(script.path);
              await resetRaycast();
            }}
          />
          <Action
            title="Edit Script File"
            icon={Icon.Pencil}
            shortcut={{ modifiers: ["opt"], key: "return" }}
            onAction={async () => {
              await open(script.path);
              await resetRaycast();
            }}
          />
          <Action
            icon={Icon.TextCursor}
            title="Run with Selected Text"
            shortcut={{ modifiers: ["cmd"], key: "e" }}
            onAction={async () => {
              const selectedText = await getSelectedText();
              await runScript(script.id, selectedText);
              await resetRaycast();
            }}
          />
          <Action.Push
            icon={Icon.Forward}
            shortcut={{ modifiers: ["cmd"], key: "l" }}
            title="Specify Input and Run"
            target={<InputForm script={script} />}
          />
          <Action.CopyToClipboard
            title="Copy Deeplink"
            content={`okjson://script/${script.id}`}
            shortcut={{ modifiers: ["cmd"], key: "u" }}
          />
        </ActionPanel>
      }
      icon={{ source: "script-icon.png" }}
      title={script.name}
      subtitle={script.description}
    ></List.Item>
  );
}

export default function Command() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const fetchScripts = useCallback(async () => {
    const result = await getScripts();
    setScripts(result);
  }, []);
  useEffect(() => {
    checkForInstallation().then((isInstalled) => {
      if (isInstalled) {
        fetchScripts();
      }
    });
  }, [fetchScripts]);
  return (
    <List navigationTitle="Run Script in OK JSON">
      {scripts.map((val) => {
        return <ScriptItem script={val} />;
      })}
    </List>
  );
}
