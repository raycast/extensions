import { Detail, Clipboard, Form, ActionPanel, Action } from "@raycast/api";
import { Fragment, useEffect, useState } from "react";

const code = (txt: string) => {
  try {
    return `# Decoded data
\`\`\`text
${atob(txt)}
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

  const decoded = code(state);
  return decoded !== null && state !== "" ? (
    <Detail navigationTitle="Decode Base64" markdown={decoded} />
  ) : (
    <Fragment>
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Decode"
              onSubmit={async (values) => {
                const text = values.input;
                setState(text);
                await Clipboard.copy(text);
              }}
            />
          </ActionPanel>
        }
        enableDrafts={true}
      >
        <Form.TextArea autoFocus storeValue id="input" title="Text area" placeholder="Your base64..." />
        <Form.Description text="You can copy and paste your base64 or open with your data already copied" />
      </Form>
    </Fragment>
  );
}
