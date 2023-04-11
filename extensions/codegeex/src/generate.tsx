import { ActionPanel, Action, Form, showToast, Toast, getPreferenceValues, getSelectedText } from "@raycast/api";
import { useEffect, useState } from "react";
import { codeGenerateFormApi } from "./api";
import { onCopy } from "./hooks";

const languageList = [
  "C++",
  "C",
  "C#",
  "Java",
  "Python",
  "HTML",
  "PHP",
  "Javascript",
  "TypeScript",
  "Go",
  "Rust",
  "SQL",
  "Kotlin",
  "Fortran",
  "R",
];

export default function Command() {
  const [code, setCode] = useState<string>();
  const onSubmit = async ({ prompt, lang }: any) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Loading...",
    });
    try {
      const res = await codeGenerateFormApi({ prompt, lang });
      if (res.data.status === 0) {
        toast.style = Toast.Style.Success;
        toast.title = "Success";
        setCode(`${code}${res.data.result.output.code.join("")}`);
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = res.data.message;
      }
    } catch (error: any) {
      toast.style = Toast.Style.Failure;
      toast.title = error.message || "Something went wrong, please try again";
    }
  };
  const copy = () => onCopy({ rawCode: code || "" });
  const { language } = getPreferenceValues();
  const fetchSelectedText = async () => {
    const res = await getSelectedText();
    setCode(res || "");
  };
  useEffect(() => {
    fetchSelectedText();
  }, []);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={onSubmit} />
          <Action title="Copy" onAction={copy} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="lang" title="Language" defaultValue={language}>
        {languageList.map((v) => (
          <Form.Dropdown.Item value={v} title={v} key={v} />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        id="prompt"
        title="Code"
        placeholder="Enter comments/code to allow the CodeGeex to continue"
        value={code}
        onChange={(e) => setCode(e)}
      />
    </Form>
  );
}
