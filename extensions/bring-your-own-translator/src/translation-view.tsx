import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  LaunchProps,
  LaunchType,
  Toast,
  launchCommand,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { defaultPrompt, translate } from "./api";
import { cleanInput } from "./input";
import { loadPrompt } from "./edit-prompt";
import languages from "./languages.json";
import type { TranslationContext } from "./clipboard";

export default function Command({
  launchContext,
}: LaunchProps<{ launchContext: TranslationContext }>) {
  return (
    <TranslationView
      key={launchContext?.requestId || "manual"}
      input={launchContext?.input}
    />
  );
}

function TranslationView({ input }: { input?: TranslationContext["input"] }) {
  const preferences = getPreferenceValues<Preferences>();
  const [busy, setBusy] = useState(false);
  const [checkingInput, setCheckingInput] = useState(true);
  const [text, setText] = useState("");
  const [target, setTarget] = useState(cleanInput(preferences.target));
  const [prompt, setPrompt] = useState(preferences.prompt || defaultPrompt);
  const [showOptions, setShowOptions] = useState(false);
  const [source, setSource] = useState("手动输入");
  const pending = useRef<AbortController | null>(null);
  const { push } = useNavigation();
  useEffect(() => {
    let active = true;
    async function launch() {
      const savedPrompt = await loadPrompt();
      if (!active) return;
      setPrompt(savedPrompt);
      if (input) {
        const label = input.source === "selection" ? "选中文本" : "剪贴板";
        setText(input.text);
        setSource(label);
        await submit(input.text, label, savedPrompt);
      }
      if (active) setCheckingInput(false);
    }
    void launch().catch(async () => {
      if (!active) return;
      setCheckingInput(false);
      await showToast({
        style: Toast.Style.Failure,
        title: "读取 Prompt 失败，请重试",
      });
    });
    return () => {
      active = false;
      pending.current?.abort();
    };
  }, []);

  async function submit(
    input: string,
    inputSource: string,
    systemPrompt = prompt,
  ) {
    if (pending.current) return;
    input = cleanInput(input);
    setText(input);
    setPrompt(cleanInput(systemPrompt));
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    try {
      const result = await translate(
        { ...preferences, target, prompt: systemPrompt },
        input,
        controller.signal,
      );
      if (!controller.signal.aborted)
        push(
          <Detail
            navigationTitle={`${inputSource} → ${target}`}
            markdown={result}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.CopyToClipboard title="复制译文" content={result} />
                  <Action.Paste
                    title="粘贴译文"
                    content={result}
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="查看原文"
                    icon={Icon.Text}
                    onAction={() =>
                      push(
                        <Detail
                          navigationTitle="原文"
                          markdown={input}
                          actions={
                            <ActionPanel>
                              <Action.CopyToClipboard
                                title="复制原文"
                                content={input}
                              />
                            </ActionPanel>
                          }
                        />,
                      )
                    }
                  />
                  <Action
                    title="编辑默认 System Prompt"
                    icon={Icon.Text}
                    onAction={() =>
                      launchCommand({
                        name: "edit-prompt",
                        type: LaunchType.UserInitiated,
                      })
                    }
                  />
                  <Action
                    title="打开扩展设置"
                    icon={Icon.Gear}
                    onAction={openExtensionPreferences}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />,
        );
    } catch (error) {
      if (!controller.signal.aborted)
        await showToast({
          style: Toast.Style.Failure,
          title: "翻译失败",
          message:
            error instanceof Error &&
            !["TypeError", "TimeoutError"].includes(error.name)
              ? error.message
              : "网络请求失败或超时，请检查服务地址和网络。",
        });
    } finally {
      pending.current = null;
      setBusy(false);
    }
  }

  if (checkingInput)
    return (
      <Detail
        isLoading
        navigationTitle="翻译"
        markdown={
          busy
            ? `## 正在翻译\n\n${source} → ${target}`
            : "## 正在获取原文\n\n选中文本优先，其次读取剪贴板。"
        }
      />
    );

  return (
    <Form
      navigationTitle={`翻译 → ${target}`}
      isLoading={busy}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="翻译"
            icon={Icon.Globe}
            onSubmit={() => submit(text, source)}
          />
          <Action
            title={showOptions ? "收起翻译选项" : "调整语言与 Prompt"}
            icon={Icon.Cog}
            shortcut={Keyboard.Shortcut.Common.Open}
            onAction={() => setShowOptions(!showOptions)}
          />
          <Action
            title="编辑默认 System Prompt"
            icon={Icon.Text}
            onAction={() =>
              launchCommand({
                name: "edit-prompt",
                type: LaunchType.UserInitiated,
              })
            }
          />
          <Action
            title="打开扩展设置"
            icon={Icon.Gear}
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="text"
        title="原文"
        value={text}
        onChange={(value) => {
          setText(value);
          setSource("手动输入");
        }}
        onBlur={() => setText(cleanInput(text))}
        autoFocus
        placeholder="输入文字，按 Enter 翻译"
      />
      <Form.Description title="" text={`翻译为${target} · ⌘O 调整选项`} />
      {showOptions && <Form.Separator />}
      {showOptions && (
        <Form.Dropdown
          id="target"
          title="目标语言"
          value={target}
          onChange={setTarget}
        >
          {!languages.some((language) => language.value === target) && (
            <Form.Dropdown.Item value={target} title={target} />
          )}
          {languages.map((language) => (
            <Form.Dropdown.Item
              key={language.code}
              value={language.value}
              title={language.title}
            />
          ))}
        </Form.Dropdown>
      )}
      {showOptions && (
        <Form.TextArea
          id="prompt"
          title="前置 Prompt"
          value={prompt}
          onChange={setPrompt}
          onBlur={() => setPrompt(cleanInput(prompt))}
          info="{{target}} 会替换为目标语言；本页修改仅用于当前会话。"
        />
      )}
    </Form>
  );
}
