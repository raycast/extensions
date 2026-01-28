import { useEffect, useState } from "react";
import {
  Form,
  ActionPanel,
  Action,
  showToast,
  closeMainWindow,
  popToRoot,
  List,
  Icon,
  open,
  Color,
} from "@raycast/api";
import { defaultName } from "./preference";
import { write } from "./api";
import { checkInstallation } from "./utils";

export default function QuickNote() {
  const [loading, setIsLoading] = useState(true);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const checkAndPush = async () => {
      setInstalled(await checkInstallation(false));
      setIsLoading(false);
    };
    checkAndPush();
  }, []);

  const [name, setName] = useState(defaultName());
  const [text, setText] = useState(defaultText());

  function defaultText() {
    return name ? `# ${name}\n\n` : "";
  }

  function onSubmit(value: { name: string; text: string }) {
    write(value, onSaved);
  }

  async function onSaved(success: boolean, message?: string) {
    if (success) {
      await closeMainWindow();
      await popToRoot({ clearSearchBar: true });
    } else {
      await showToast({ title: "Failed to save note", message: message });
    }
  }

  function resetForm() {
    setName(defaultName());
    setText(defaultText());
  }

  if (loading) {
    return <Form isLoading={true}></Form>;
  }

  if (!installed) {
    return (
      <List>
        <List.EmptyView
          title="iA Writer is not installed"
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          actions={
            <ActionPanel>
              <Action
                title={"Get iA Writer"}
                onAction={() => {
                  open("https://ia.net/writer");
                }}
              />
            </ActionPanel>
          }
        ></List.EmptyView>
      </List>
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={onSubmit} />
          <Action title="Reset Form" onAction={resetForm}></Action>
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Filename" value={name} onChange={(name) => setName(name)} />
      <Form.TextArea
        id="text"
        title="Content"
        value={text}
        autoFocus={defaultText() !== ""}
        onChange={(text) => setText(text)}
      />
    </Form>
  );
}
