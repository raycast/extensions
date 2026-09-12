import { ActionPanel, Action, Form, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { codeTranslateFormApi } from "./api";

const languageList = ["C++", "C#", "Java", "Python", "JavaScript", "TypeScript", "Go", "PHP"];

export default function Command() {
  const [promptError, setPromptError] = useState<string | undefined>();
  const [result, setResult] = useState();
  const onSubmit = async ({ prompt, source, target }: any) => {
    if (prompt.length == 0) {
      setPromptError("The field should't be empty!");
      return;
    }
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Loading...",
    });
    try {
      const res = await codeTranslateFormApi({ prompt, source, target });
      if (res.data.status === 0) {
        toast.style = Toast.Style.Success;
        toast.title = "Success";
        setResult(res.data.result.output.code.join(""));
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = res.data.message;
      }
    } catch (error: any) {
      toast.style = Toast.Style.Failure;
      toast.title = error.message || "Something went wrong, please try again";
    }
  };
  function dropPromptErrorIfNeeded() {
    if (promptError && promptError.length > 0) {
      setPromptError(undefined);
    }
  }
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="source" title="Source Language" defaultValue="Python">
        {languageList.map((v) => (
          <Form.Dropdown.Item value={v} title={v} key={v} />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        id="prompt"
        title="Source Code"
        placeholder="Enter the code you want to translate"
        error={promptError}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setPromptError("The field should't be empty!");
          } else {
            dropPromptErrorIfNeeded();
          }
        }}
      />
      <Form.Separator />
      <Form.Dropdown id="target" title="Target Language" defaultValue="Go">
        {languageList.map((v) => (
          <Form.Dropdown.Item value={v} title={v} key={v} />
        ))}
      </Form.Dropdown>
      <Form.TextArea value={result} id="result" title="Target Code" placeholder="Press the ⌘⏎ to translate the code" />
    </Form>
  );
}
