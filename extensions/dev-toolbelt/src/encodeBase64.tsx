import { Detail, Clipboard, Form, ActionPanel, Action } from "@raycast/api";
import { Fragment, useEffect, useState } from "react";

const encodeText = (txt: string) => {
  try {
    return `# Encoded data
\`\`\`text
${btoa(txt)}
\`\`\`

# Your input
\`\`\`text
${txt}
\`\`\``;
  } catch (e) {
    return null;
  }
};

export default function Command() {
  const [state, setState] = useState<string>("");

  useEffect(() => {
    const async = async () => {
      try {
        const content = await Clipboard.readText();
        setState(content ?? "");
      } catch (e) {
        setState("");
      }
    };
    async();
  }, []);

  const decoded = encodeText(state);
  return decoded !== null && state !== "" ? (
    <Detail navigationTitle="Encode Base64" markdown={decoded} />
  ) : (
    <Fragment>
      <Form
        enableDrafts={true}
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Encode"
              onSubmit={async (values) => {
                const text = values.input;
                setState(text);
                await Clipboard.copy(btoa(text));
              }}
            />
          </ActionPanel>
        }
      >
        <Form.TextArea autoFocus storeValue id="input" title="Text area" placeholder="Your text..." />
        <Form.Description text="You can copy and paste your text or open with your data already copied" />
      </Form>
    </Fragment>
  );
}
