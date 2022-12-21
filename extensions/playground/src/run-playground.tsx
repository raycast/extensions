import { Form, ActionPanel, Action, Color } from "@raycast/api";

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={(values) => {
              console.log(values);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TagPicker id="test" title="tag picker testsawdwasdsdawdawd" storeValue>
        <Form.TagPicker.Item
          value="orange"
          title="orange"
          icon={{
            source: `icon.png`,
            tintColor: Color.PrimaryText,
          }}
        />
        <Form.TagPicker.Item value="green" title="green" />
        <Form.TagPicker.Item value="blue" title="blue" />
      </Form.TagPicker>
    </Form>
  );
}
