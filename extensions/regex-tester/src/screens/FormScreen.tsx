import { FC, useEffect, useState } from "react";
import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";

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
  const [source, setSource] = useState("new");

  const {
    isLoading,
    value: pastStrings,
    removeValue: clearPreviousStrings,
  } = useLocalStorage<TestStringHistory[]>("test-string-history");

  useEffect(() => {
    if (sources[source]) {
      setText(sources[source]);
    } else {
      setText(pastStrings?.find((str) => str.id === source)?.value || "");
    }
  }, [source]);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} title="Test Regex" onSubmit={onSubmit} />
          <Action
            icon={Icon.ClearFormatting}
            title="Clear Previous Test Strings"
            onAction={clearPreviousStrings}
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "backspace" },
              Windows: { modifiers: ["ctrl"], key: "backspace" },
            }}
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
