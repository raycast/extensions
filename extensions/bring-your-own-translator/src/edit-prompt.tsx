import {
  Action,
  ActionPanel,
  Form,
  LocalStorage,
  Toast,
  getPreferenceValues,
  showToast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { Config, defaultPrompt } from "./api";
import { cleanInput } from "./input";

export async function loadPrompt(): Promise<string> {
  return (
    cleanInput(
      (await LocalStorage.getItem<string>("system-prompt")) ??
        getPreferenceValues<Config>().prompt ??
        "",
    ) || defaultPrompt
  );
}

export default function EditPrompt() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    loadPrompt()
      .then(setPrompt)
      .catch(() =>
        showToast({ style: Toast.Style.Failure, title: "读取 Prompt 失败" }),
      )
      .finally(() => setLoading(false));
  }, []);
  async function save() {
    if (loading) return;
    const value = cleanInput(prompt) || defaultPrompt;
    try {
      await LocalStorage.setItem("system-prompt", value);
      setPrompt(value);
      await showToast({
        style: Toast.Style.Success,
        title: "已保存，下次翻译生效",
      });
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "保存失败，请重试",
      });
    }
  }
  return (
    <Form
      navigationTitle="System Prompt"
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="保存 Prompt" onSubmit={save} />
          <Action
            title="填入默认 Prompt"
            onAction={() => setPrompt(defaultPrompt)}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="prompt"
        title="System Prompt"
        value={prompt}
        onChange={setPrompt}
        onBlur={() => setPrompt(cleanInput(prompt))}
        autoFocus
        info="{{target}} 会替换为目标语言。⌘Enter 保存，留空则使用默认 Prompt。"
      />
      <Form.Description
        title=""
        text="保存后用于选中文本、剪贴板和手动翻译，优先于 Raycast 设置里的初始 Prompt。"
      />
    </Form>
  );
}
