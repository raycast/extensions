import { Form, ActionPanel, Action, showToast } from "@raycast/api";

//@ts-expect-error
import toTitle from "title";

type Values = {
  str: string;
};

function pbcopy(data: string) {
  var proc = require("child_process").spawn("pbcopy");
  proc.stdin.write(data);
  proc.stdin.end();
}

export default function Command() {
  function handleSubmit(values: Values) {
    const title = toTitle(values.str);
    pbcopy(title);
    showToast({ title: "Converted to title case", message: "Copied to clipboard" });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="str" title="" placeholder="Enter text" defaultValue="" />
    </Form>
  );
}
