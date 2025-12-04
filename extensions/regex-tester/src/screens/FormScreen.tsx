import { FC, useCallback, useEffect, useState } from "react";
import { Action, ActionPanel, Form, LocalStorage } from "@raycast/api";
import { useAsync } from "react-async-hook";

export type TestStringFormValues = {
  text: string;
  source: string;
};

interface Props {
  onSubmit: (values: TestStringFormValues) => void;
}

type TestStringHistory = {
  id: string;
  value: string;
};

const FormScreen: FC<Props> = ({ onSubmit }) => {
  const [text, setText] = useState("");
  const [pastStrings, setPastStrings] = useState<TestStringHistory[] | undefined>();
  const [source, setSource] = useState("new");

  useAsync(async () => {
    const item = await LocalStorage.getItem<string>("test-string-history");
    if (!item) return;
    setPastStrings(JSON.parse(item));
  }, []);

  useEffect(() => {
    if (sources[source]) {
      setText(sources[source]);
    } else {
      setText(pastStrings?.find((str) => str.id === source)?.value || "");
    }
  }, [source]);

  const clearPreviousStrings = useCallback(() => {
    LocalStorage.removeItem("test-string-history");
    setPastStrings(undefined);
  }, []);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Test Regex" onSubmit={onSubmit} />
          <Action
            title="Clear Previous Test Strings"
            onAction={clearPreviousStrings}
            shortcut={{ modifiers: ["cmd"], key: "backspace" }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="source" title="" defaultValue="new" onChange={setSource}>
        <Form.Dropdown.Item value="new" title="New Test String" />
        <Form.Dropdown.Item value="lorem" title="Lorem Ipsum" />
        {pastStrings && (
          <Form.Dropdown.Section title="Previous Test Strings">
            {pastStrings.map((str) => (
              <Form.Dropdown.Item key={str.id} value={str.id} title={str.value} />
            ))}
          </Form.Dropdown.Section>
        )}
      </Form.Dropdown>
      <Form.TextArea id="text" title="" placeholder="Enter your test string" value={text} onChange={setText} />
    </Form>
  );
};

const sources: Record<string, string> = {
  lorem:
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla malesuada viverra elit, at placerat metus dictum at. Aliquam pretium, massa nec interdum hendrerit, libero ipsum rutrum nibh, iaculis fringilla magna ante sit amet quam. Donec imperdiet leo risus, et accumsan sem malesuada eu. Nunc suscipit urna magna, sit amet tempus lectus laoreet vitae. Fusce in dolor vitae lacus luctus ullamcorper. Maecenas faucibus fringilla feugiat. Phasellus purus mauris, molestie vel dolor eget, posuere iaculis mauris. Nunc blandit neque ut semper ultrices. Cras tempus mollis pharetra. Quisque euismod orci eget augue lobortis feugiat. Suspendisse at consequat eros.",
};

export default FormScreen;
