import { ActionPanel, Form, Action, useNavigation, popToRoot } from "@raycast/api";
import { useState } from "react";
import { CustomPrompt, CustomPrompts } from "./types";
import { getStorageCount, setStorage, updateStoredPrompts } from "./utils";

export default function CreatePrompt({
  values,
  state,
  setState,
}: {
  values?: CustomPrompt;
  state?: CustomPrompts;
  setState?: (c: CustomPrompts) => void;
}) {
  const [newPrompt, setNewPrompt] = useState<CustomPrompt>({
    name: values?.name ?? "",
    prompt: values?.prompt ?? "",
    role: "system",
  });
  const { pop } = useNavigation();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save custom prompt"
            onSubmit={async (values) => {
              const index = (await getStorageCount(true)) + 1;
              updateStoredPrompts({
                [values?.name]: { name: values?.name, prompt: values?.prompt, role: "system", index: index },
              });
              if (setState)
                setState({
                  ...state,
                  [values?.name]: { name: values?.name, prompt: values?.prompt, role: "system", index: index },
                });
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        info="Name of the custom prompt"
        title="Name"
        placeholder="Linux terminal"
        value={newPrompt?.name}
        onChange={(e) => setNewPrompt({ ...newPrompt, name: e })}
      />
      <Form.TextArea
        id="prompt"
        info="System/context prompt"
        title="Prompt"
        value={newPrompt?.prompt}
        placeholder={`E.g: Act as a Linux terminal.`}
        onChange={(e) => setNewPrompt({ ...newPrompt, prompt: e })}
      />
    </Form>
  );
}
