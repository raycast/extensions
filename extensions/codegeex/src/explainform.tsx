import { ActionPanel, Action, Form, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { codeExplainFormApi } from "./api";

const languageList = ["C++", "C", "C#", "Java", "Python", "Javascript", "TypeScript", "Go", "Rust"];

export default function Command() {
  const [promptError, setPromptError] = useState<string | undefined>();
  const [result, setResult] = useState();
  const onSubmit = async ({ prompt, lang, locale }: any) => {
    if (prompt.length == 0) {
      setPromptError("The field should't be empty!");
      return;
    }
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Loading...",
    });
    try {
      const res = await codeExplainFormApi({ prompt, lang, locale });
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
      <Form.Dropdown id="lang" title="Language" defaultValue="Python">
        {languageList.map((v) => (
          <Form.Dropdown.Item value={v} title={v} key={v} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="locale" title="Comments Language" defaultValue="zh-CN">
        <Form.Dropdown.Item value="en-US" title="English" icon="🇺🇸" />
        <Form.Dropdown.Item value="zh-CN" title="Chinese" icon="🇨🇳" />
      </Form.Dropdown>
      <Form.TextArea
        id="prompt"
        title="Source Code"
        placeholder="Enter the code you want to add comments to"
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
      <Form.TextArea
        value={result}
        id="result"
        title="Commented Code"
        placeholder="Press the ⌘⏎ to add comments to the code"
      />
    </Form>
  );
}
