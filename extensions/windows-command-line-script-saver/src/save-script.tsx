import { Form, ActionPanel, Action, showToast, LocalStorage, Toast } from "@raycast/api";

type Values = {
  name: string;
  dir: string;
  commands: string;
};

interface Script {
  id: string;
  name: string;
  dir: string;
  commands: string[];
  lastAccessed: number;
}

export default function Command() {
  function handleSubmit(values: Values) {
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

    // get existing scripts from local storage and append the new one,
    // with an id of +1 compared to the last script (if none exist, start with id 1)
    LocalStorage.getItem<string>("scripts").then((storedScripts) => {
      let scripts: Script[] = [];
      if (storedScripts) {
        scripts = JSON.parse(storedScripts);
      }
      const newScript: Script = {
        id: scripts.length > 0 ? (parseInt(scripts[scripts.length - 1].id) + 1).toString() : "1",
        name: name,
        dir: dir,
        commands: cmds,
        lastAccessed: Date.now(),
      };
      scripts.push(newScript);
      LocalStorage.setItem("scripts", JSON.stringify(scripts));
    });

    showToast({ title: "Script Saved", message: "Try it out using the 'View Scripts' page!" });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Save a new command prompt script." />
      <Form.TextField id="name" title="Script Name" placeholder="Enter a name for this script" />
      <Form.Separator />
      <Form.TextField id="dir" title="Working Directory" placeholder="Enter the working directory" defaultValue="C:\" />
      <Form.TextArea id="commands" title="Commands" placeholder="Enter commands, separated by newlines" />
    </Form>
  );
}
