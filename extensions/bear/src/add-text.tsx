import { ActionPanel, Action, closeMainWindow, Form, Icon, showToast, Toast, popToRoot } from "@raycast/api";
import open from "open";
import { useEffect, useState } from "react";
import { Note } from "./bear-db";

interface FormValues {
  mode: string;
  text: string;
  tags: string;
  header: string;
  openNote: string;
  pin: boolean;
  newLine: boolean;
  timestamp: boolean;
}

interface HeaderObject {
  level: number;
  text: string;
}

function getHeaderObjects(text: string) {
  const headerRegex = /(^|\n)(?<level>#{1,6})[^\S\t\n\r](?<text>.*)\n/g;
  const matches = text.matchAll(headerRegex);
  const headerObjects: HeaderObject[] = [];
  for (const match of matches) {
    const headerObject = {
      level: match.groups?.level.length ?? 1,
      text: match.groups?.text ?? "Some Header",
    };
    headerObjects.push(headerObject);
  }
  return headerObjects;
}

export default function AddText({ note }: { note: Note }) {
  const [headers, setHeaders] = useState<HeaderObject[]>([]);

  useEffect(() => {
    setHeaders(getHeaderObjects(note.text));
  }, []);

  const AppendTextAction = () => {
    const handleSubmit = async (values: FormValues) => {
      if (!values.text) {
        showToast(Toast.Style.Failure, "Please enter text");
        return;
      }
      open(
        `bear://x-callback-url/add-text?id=${note.id}${
          values.header === "none" ? "" : "&header=" + encodeURIComponent(values.header)
        }&mode=${values.mode}&new_line=${values.newLine ? "yes" : "no"}&tags=${encodeURIComponent(
          values.tags,
        )}&open_note=${values.openNote !== "no" ? "yes" : "no"}&new_window=${
          values.openNote === "new" ? "yes" : "no"
        }&show_window=${values.openNote !== "no" ? "yes" : "no"}&edit=${
          values.openNote === "no" ? "no" : "yes"
        }&timestamp=${values.timestamp ? "yes" : "no"}&text=${encodeURIComponent(values.text)}`,
        { background: values.openNote === "no" },
      );

      await closeMainWindow();
      await popToRoot({ clearSearchBar: true });
    };
    return <Action.SubmitForm icon={Icon.Plus} title="Append Text" onSubmit={handleSubmit} />;
  };

  return (
    <Form
      navigationTitle={`Add Text To: ${note.title}`}
      actions={
        <ActionPanel>
          <AppendTextAction />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="mode" title="Mode">
        <Form.Dropdown.Item value="prepend" title="Prepend" />
        <Form.Dropdown.Item value="append" title="Append" />
        <Form.Dropdown.Item value="replace" title="Replace" />
        <Form.Dropdown.Item value="replace_all" title="Replace All" />
      </Form.Dropdown>
      <Form.TextArea id="text" title="Text" placeholder="Text to add to note" />
      <Form.Separator />
      <Form.TextField id="tags" title="Tags" placeholder="comma,separated,tags" />
      <Form.Dropdown id="header" title="Append To Header">
        <Form.Dropdown.Item value="none" title="-" />
        {headers.map(({ level, text }) => (
          <Form.Dropdown.Item key={text} value={text} title={`h${level}: ${text}`} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="openNote" title="Open Note">
        <Form.Dropdown.Item value="no" title="Don't Open Note" />
        <Form.Dropdown.Item value="main" title="In Main Window" />
        <Form.Dropdown.Item value="new" title="In New Window" />
      </Form.Dropdown>
      <Form.Checkbox id="newLine" label="Force new line" />
      <Form.Checkbox id="timestamp" label="Prepend time and date" />
      <Form.Checkbox id="pin" label="Pin note in notes list" />
    </Form>
  );
}
