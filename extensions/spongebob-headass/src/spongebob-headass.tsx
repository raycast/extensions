import { Action, ActionPanel, Clipboard, Form, PopToRootType, showHUD } from "@raycast/api";
import { useState } from "react";

export default function SpongebobHeadass() {
  const [input, setInput] = useState("");

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={() => {
              const output = input
                .split("")
                .map((char, index) => (index % 2 === 0 || index % 9 === 0 ? char.toUpperCase() : char.toLowerCase()))
                .join("");

              Clipboard.copy(output);
              showHUD("Copied to clipboard", { popToRootType: PopToRootType.Immediate });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="input" title="Input" value={input} onChange={setInput} />
    </Form>
  );
}
