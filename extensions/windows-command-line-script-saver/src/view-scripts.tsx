import {
  ActionPanel,
  Action,
  Icon,
  List,
  LocalStorage,
  confirmAlert,
  Alert,
  Detail,
  useNavigation,
  Form,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { exec } from "child_process";

interface Script {
  id: string;
  name: string;
  dir: string;
  commands: string[];
  lastAccessed: number;
}

type FormValues = {
  name: string;
  dir: string;
  commands: string;
};

function ScriptOutput({ script, onExecuted }: { script: Script; onExecuted: () => void }) {
  const [output, setOutput] = useState<string>("");
  const [isError, setIsError] = useState(false);
  const [isExecuting, setIsExecuting] = useState(true);
  const { pop } = useNavigation();
  const onExecutedRef = useRef(onExecuted);

  // keep ref updated when prop changes — avoids re-creating the main effect
  useEffect(() => {
    onExecutedRef.current = onExecuted;
  }, [onExecuted]);

  useEffect(() => {
    const command = `cd /d "${script.dir}" && ${script.commands.join(" && ")}`;
    const child = exec(command, (error, stdout, stderr) => {
      setIsExecuting(false);

      if (error) {
        setIsError(true);
        setOutput(`Error executing script:\n\n${error.message}${stderr ? `\n\n${stderr}` : ""}`);
        return;
      }

      // Treat stderr as non-fatal: include it in the output but don't mark as an error
      const combinedOutput = `${stdout || ""}${stderr ? `\n\n[stderr]\n${stderr}` : ""}`.trim();
      setIsError(false);
      setOutput(combinedOutput || "Script executed successfully with no output.");

      // call stable ref to avoid effect dependency churn
      try {
        onExecutedRef.current?.();
      } catch {
        // ignore
      }
    });

    // cleanup child process if component unmounts
    return () => {
      try {
        child.kill();
      } catch {
        // ignore
      }
    };
  }, [script]);

  const markdown = isExecuting
    ? `# Executing Script...\n\nPlease wait while your script runs.`
    : isError
      ? `# ❌ Error\n\n\`\`\`\n${output}\n\`\`\``
      : `# Output\n\n\`\`\`\n${output}\n\`\`\``;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Go Back" icon={Icon.ArrowLeft} onAction={pop} />
          <Action.CopyToClipboard content={output} title="Copy Output" />
        </ActionPanel>
      }
    />
  );
}

function EditScript({ script, onUpdate }: { script: Script; onUpdate: () => void }) {
  const { pop } = useNavigation();

  async function handleSubmit(values: FormValues) {
    if (!values.name.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Error", message: "Please enter a script name." });
      return;
    }
    if (!values.dir.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Error", message: "Please enter a working directory." });
      return;
    }
    if (!values.commands.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Error", message: "Please enter at least one command." });
      return;
    }

    const name = values.name.trim();
    const dir = values.dir.trim();
    const cmds = values.commands.trim().split("\n");

    const storedScripts = await LocalStorage.getItem<string>("scripts");
    if (storedScripts) {
      const allScripts: Script[] = JSON.parse(storedScripts);
      const updatedScripts = allScripts.map((s) => (s.id === script.id ? { ...s, name, dir, commands: cmds } : s));
      await LocalStorage.setItem("scripts", JSON.stringify(updatedScripts));
      showToast({ title: "Script Updated", message: "Your changes have been saved." });
      onUpdate();
      pop();
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Save Changes" />
        </ActionPanel>
      }
    >
      <Form.Description text="Edit your command prompt script." />
      <Form.TextField
        id="name"
        title="Script Name"
        placeholder="Enter a name for this script"
        defaultValue={script.name}
      />
      <Form.Separator />
      <Form.TextField
        id="dir"
        title="Working Directory"
        placeholder="Enter the working directory"
        defaultValue={script.dir}
      />
      <Form.TextArea
        id="commands"
        title="Commands"
        placeholder="Enter commands, separated by newlines"
        defaultValue={script.commands.join("\n")}
      />
    </Form>
  );
}

export default function Command() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  useEffect(() => {
    async function loadScripts() {
      const storedScripts = await LocalStorage.getItem<string>("scripts");
      if (storedScripts) {
        const parsedScripts = JSON.parse(storedScripts);
        // Sort by lastAccessed, most recent first
        parsedScripts.sort((a: Script, b: Script) => b.lastAccessed - a.lastAccessed);
        setScripts(parsedScripts);
      }
      setIsLoading(false);
    }
    loadScripts();
  }, []);

  async function updateScriptTimestamp(scriptId: string) {
    const storedScripts = await LocalStorage.getItem<string>("scripts");
    if (storedScripts) {
      const allScripts: Script[] = JSON.parse(storedScripts);
      const updatedScripts = allScripts.map((s) => (s.id === scriptId ? { ...s, lastAccessed: Date.now() } : s));
      await LocalStorage.setItem("scripts", JSON.stringify(updatedScripts));
      // Update local state and re-sort
      updatedScripts.sort((a, b) => b.lastAccessed - a.lastAccessed);
      setScripts(updatedScripts);
    }
  }

  async function reloadScripts() {
    const storedScripts = await LocalStorage.getItem<string>("scripts");
    if (storedScripts) {
      const parsedScripts = JSON.parse(storedScripts);
      parsedScripts.sort((a: Script, b: Script) => b.lastAccessed - a.lastAccessed);
      setScripts(parsedScripts);
    }
  }

  async function deleteScript(scriptId: string) {
    if (
      await confirmAlert({
        title: "Delete Script",
        message: "Are you sure you want to delete this script? This action cannot be undone.",
        icon: Icon.Trash,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      const updatedScripts = scripts.filter((s) => s.id !== scriptId);
      setScripts(updatedScripts);
      await LocalStorage.setItem("scripts", JSON.stringify(updatedScripts));
    }
  }

  return (
    <List isLoading={isLoading} isShowingDetail>
      {scripts.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Terminal}
          title="No Scripts Saved"
          description="Use 'Save Script' to create your first command line script"
        />
      ) : (
        scripts.map((script) => (
          <List.Item
            key={script.id}
            icon={Icon.Terminal}
            title={script.name}
            detail={
              <List.Item.Detail
                markdown={`## Commands\n\`\`\`bash\n${script.commands.join("\n")}\n\`\`\``}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Working Directory" icon={Icon.Folder} text={script.dir} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Number of Commands"
                      text={script.commands.length.toString()}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action
                  title="Execute Script"
                  icon={Icon.Terminal}
                  onAction={() => {
                    push(<ScriptOutput script={script} onExecuted={() => updateScriptTimestamp(script.id)} />);
                  }}
                  shortcut={{ modifiers: [], key: "return" }}
                />
                <Action
                  title="Edit Script"
                  icon={Icon.Pencil}
                  onAction={() => {
                    push(<EditScript script={script} onUpdate={reloadScripts} />);
                  }}
                  shortcut={{ modifiers: ["ctrl"], key: "e" }}
                />
                <Action.CopyToClipboard
                  content={script.commands.join("\n")}
                  title="Copy Commands"
                  shortcut={{ modifiers: ["ctrl"], key: "c" }}
                />
                <Action.CopyToClipboard
                  content={`cd /d "${script.dir}" && ${script.commands.join(" && ")}`}
                  title="Copy Full Script"
                  shortcut={{ modifiers: ["ctrl", "shift"], key: "c" }}
                />
                <Action
                  title="Delete Script"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => deleteScript(script.id)}
                  shortcut={{ modifiers: ["ctrl"], key: "d" }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
