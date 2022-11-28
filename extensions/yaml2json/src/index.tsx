import { Form, ActionPanel, Action, showToast, Toast, showHUD, popToRoot, Clipboard, Detail } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";

import { copyToClipboard, generateJsonFromYaml, isValidYaml } from "./utils";

function JsonView(props: { yaml: string }) {
  const { yaml } = props;
  const { data } = useCachedPromise(async () => {
    if (!(await isValidYaml(yaml))) {
      return;
    }

    return await generateJsonFromYaml(yaml);
  }, []);

  if (data === undefined) {
    return <Command />;
  }

  return (
    <Detail
      navigationTitle="Generated Json"
      markdown={JSON.stringify(data, null, "\t")}
      actions={
        <ActionPanel>
          <Action.Push title="Back" target={<Command />} />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [yaml, setYaml] = useState<string>("");
  const [minify, setMinify] = useState<boolean>(false);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={copyToClipboard} title="Generate and copy" />
          <Action.Push
            title="Show generated json"
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            target={<JsonView yaml={yaml} />}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="This form showcases all available form elements." />
      <Form.TextArea id="textarea" title="Yaml" placeholder="Enter your yaml" value={yaml} onChange={setYaml} />
      <Form.Checkbox
        id="checkbox"
        title="Checkbox"
        label="Minimize Json"
        onChange={() => setMinify(!minify)}
        storeValue={true}
      />
    </Form>
  );
}
