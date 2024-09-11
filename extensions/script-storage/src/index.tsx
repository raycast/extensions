import {
  ActionPanel,
  List,
  Action,
  Form,
  showToast,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
  useNavigation,
} from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { useState, useEffect } from "react";
import { Script, Preferences } from "./types";
import { basename, resolve } from "path";
import { readFile, writeFile, readFileSync, pathExists } from "fs-extra";
import { execa } from "execa";

// paths where store all the scripts
const preferences = getPreferenceValues<Preferences>();
const storagePath = resolve(preferences.scriptsListJsonPath);
const scriptsListPath = resolve(preferences.scriptsListJsonPath, "scripts.json");
const shellPath = resolve("/bin", preferences.shell);

export default function ScriptsList() {
  const [scripts, setScripts] = useState<Script[]>([]);

  // backup each time scripts changes, use timeout to avoid initialization sync
  useEffect(() => {
    setTimeout(() => {
      backupScriptsToLocal();
    }, 500);
  }, [scripts]);

  useEffect(() => {
    // try load from preference
    loadScriptsFromLocal();
  }, []);

  const backupScriptsToLocal = async () => {
    const json = JSON.stringify({ scripts });

    // console.log("backing up", json);

    await writeFile(scriptsListPath, json)
      .then(() =>
        showToast({
          title: "Backup Successful!",
          style: Toast.Style.Success,
        }),
      )
      .catch((err) => {
        console.log("No such file exists", err);
        showToast({
          title: "Backup Failed",
          style: Toast.Style.Failure,
        });
      });
  };

  const loadScriptsFromLocal = async () => {
    if (preferences.scriptsListJsonPath) {
      readFile(scriptsListPath)
        .then((buffer) => buffer.toString())
        .then(JSON.parse)
        .then((json) => {
          setScripts(json.scripts ?? []);
          showToast({
            style: Toast.Style.Success,
            title: "Scripts JSON Loaded!",
          });
        })
        .catch((err) => {
          console.error(err);
          showToast({
            style: Toast.Style.Failure,
            title: "Scripts JSON error",
            message: "Either storage path or scripts.json does not exists",
          });
        });
    }
  };

  return (
    <ScriptList
      scripts={scripts}
      setScripts={setScripts}
      backupScriptsToLocal={backupScriptsToLocal}
      loadScriptsFromLocal={loadScriptsFromLocal}
    />
  );
}

const ScriptList = (props: {
  scripts: Script[];
  setScripts: React.Dispatch<React.SetStateAction<Script[]>>;
  backupScriptsToLocal: () => Promise<void>;
  loadScriptsFromLocal: () => Promise<void>;
}) => {
  const { scripts, setScripts, backupScriptsToLocal, loadScriptsFromLocal } = props;

  const addScript = async (newScript: Script) => {
    // at the beginning, can be ordered in json
    const newList = [newScript, ...scripts];
    setScripts(newList);
  };

  /**
   * Remove script from list, but keeps local .sh file
   * @param scriptName
   */
  const removeScript = (scriptName: string) => {
    const newList = scripts.filter((script) => script.name !== scriptName);
    setScripts(newList);
  };

  /**
   * Edit existing script
   * @param scriptName
   */
  const editScriptJSON = (newScript: Script, scriptName: string) => {
    console.log("editing", scriptName);

    const newList = scripts.map((script) => {
      console.log(script);
      return script.name == scriptName ? newScript : script;
    });

    console.log(newList);

    setScripts(newList);
  };

  const getFileContent = (filePath: string) => {
    let markdown = "# placeholder";

    try {
      markdown = readFileSync(filePath).toString();
      markdown = `\`\`\`bash\n${markdown}\n\`\`\``;
    } catch (err) {
      console.log(err, "readfile failed");
    }

    return markdown;
  };

  return (
    <List
      isShowingDetail={true}
      navigationTitle="Script Storage"
      searchBarPlaceholder="Search scripts"
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Manage Script">
            <Action.Push title="Add Script" target={<ScriptForm addScript={addScript} />} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Extension Setting">
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
            <Action title="Backup to Local" onAction={backupScriptsToLocal} />
            <Action title="Load Backup From Local" onAction={loadScriptsFromLocal} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      {scripts.map((script, key) => (
        <List.Item
          title={script.name}
          key={key}
          subtitle={basename(script.filePath)}
          detail={<List.Item.Detail markdown={getFileContent(script.filePath)} />}
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Manage Scripts">
                <Action title="Run Script" onAction={() => runScript({ scriptPath: script.filePath })} />
                <Action.Push
                  title="Edit Script Content"
                  target={<EditScriptForm scriptPath={script.filePath} reloadScript={loadScriptsFromLocal} />}
                />
                <Action.Push
                  title="Edit Script Setting"
                  target={
                    <ScriptForm
                      editScriptJSON={(newScript: Script) => editScriptJSON(newScript, script.name)}
                      scriptConfig={script}
                    />
                  }
                />
                <Action title="Remove Script" onAction={() => removeScript(script.name)} />
                <Action.Push title="Add New Script" target={<ScriptForm addScript={addScript} />} />
              </ActionPanel.Section>
              <ActionPanel.Section title="Settings">
                <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
                <Action title="Backup to Local" onAction={backupScriptsToLocal} />
                <Action title="Load Backup From Local" onAction={loadScriptsFromLocal} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};

const EditScriptForm = (props: { scriptPath: string; reloadScript: () => Promise<void> }) => {
  const { scriptPath, reloadScript } = props;
  const { pop } = useNavigation();
  let fileContent = "Error Reading File, please go back";

  // load file content
  try {
    fileContent = readFileSync(scriptPath).toString();
  } catch (err) {
    console.log(err);
  }

  const updateFile = async (values: { newContent: string }) => {
    // console.log("updating", values.newContent);
    await writeFile(scriptPath, values.newContent);
    await reloadScript();
    pop();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Script" onSubmit={updateFile} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="newContent" value={fileContent}></Form.TextArea>
    </Form>
  );
};

const ScriptForm = (props: {
  addScript?: (newScript: Script) => void;
  editScriptJSON?: (newScript: Script) => void;
  scriptConfig?: Script;
}) => {
  const { addScript, editScriptJSON, scriptConfig } = props;
  const { pop } = useNavigation();

  // handles form validation
  const { handleSubmit, itemProps } = useForm<Script>({
    onSubmit(newScript: Script) {
      if (newScript.isJSONFolder) newScript.filePath = resolve(storagePath, newScript.filePath);
      if (addScript) addScript(newScript);
      if (editScriptJSON) editScriptJSON(newScript);
      pop();
      showToast({
        style: Toast.Style.Success,
        title: "Vuu!",
        message: `${newScript.name} added`,
      });
    },
    initialValues: scriptConfig ?? {},
    validation: {
      name: FormValidation.Required,
      filePath: (path = "") => {
        // eslint-disable-next-line no-useless-escape
        if (!/^(.+\/)?([^\/]+?)(\.[^.]*$|$)/gm.test(path)) {
          return "Path Format Incorrect";
        }
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={addScript ? "Create New Script" : "Save Modification"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Script Name"
        value={scriptConfig?.name ?? ""}
        placeholder='echo "Hello World!"'
        {...itemProps.name}
      />
      <Form.Checkbox
        title="Prompts"
        value={scriptConfig?.requiresPrompt ?? false}
        label="required"
        {...itemProps.requiresPrompt}
      />
      <Form.TextField
        title="Script File Path"
        value={scriptConfig?.filePath ?? ""}
        placeholder="/path/to/your/script.sh"
        {...itemProps.filePath}
      />
      <Form.Checkbox
        title="Same Folder"
        label="check if the .sh file is in scripts.json folder"
        {...itemProps.isJSONFolder}
      />
    </Form>
  );
};

const runScript = async (props: {
  scriptPath: string;
  args?: string[]; // TODO
}) => {
  const { scriptPath } = props;
  console.log(scriptPath);
  
  // try access it first
  if (!(await pathExists(scriptPath))) {
    console.log("Incorrect File Path");
    showToast({
      title: "Running Failed",
      style: Toast.Style.Failure,
      message: "Incorrect filepath or no ",
    });
    return;
  }

  let command = "not initialized";

  console.log("Command: ", command);

  switch (preferences.terminalApp) {
    case "warp":
      command = `open -a Warp ${scriptPath}`;
      break;
    case "terminal":
    default:
      command = `osascript -e 'tell application "Terminal" to do script "eval \\"${shellPath} ${scriptPath}\\";"'`;
  }

  console.log("Command: ", command);

  // now trying read it and run
  try {
    await execa({ shell: true })`${command}`;
  } catch (err) {
    console.log("running script failed");
    console.log(err);
    showToast({
      title: "Script Running Failed",
      message: err as string,
      style: Toast.Style.Failure,
    });
  }
};
