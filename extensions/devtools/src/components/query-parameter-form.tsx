import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { UrlParameter } from "../lib/url";

export function QueryParameterForm({
  parameter,
  onSubmit,
}: {
  parameter?: UrlParameter;
  onSubmit: (key: string, value: string) => void;
}) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle={parameter ? "Rename Query Parameter" : "Add Query Parameter"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={parameter ? "Rename" : "Add"}
            onSubmit={(values: { key: string; value?: string }) => {
              onSubmit(values.key, values.value ?? parameter?.value ?? "");
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="key" title="Key" placeholder="e.g. debug" defaultValue={parameter?.key ?? ""} />
      {!parameter && <Form.TextArea id="value" title="Value" placeholder="Optional" defaultValue="" />}
    </Form>
  );
}
