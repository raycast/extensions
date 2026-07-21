import { getSelectedText, showHUD, showToast, Toast } from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const WEB_SEARCH_INSTRUCTION = "请解释以下内容，并联网搜索相关背景：";

interface Arguments {
  question?: string;
}

function makePrompt(content: string): string {
  return `${WEB_SEARCH_INSTRUCTION}\n\n${content}`;
}

async function sendToChatGPT(prompt: string): Promise<void> {
  const focusComposerScript = String.raw`
tell application id "com.openai.chat" to activate
delay 0.8
tell application "System Events"
  tell first application process whose bundle identifier is "com.openai.chat"
    set frontmost to true
    keystroke "n" using command down
  end tell
end tell
`;

  const setComposerTextScript = String.raw`
on run argv
  set composerText to item 1 of argv
  tell application "System Events"
    tell first application process whose bundle identifier is "com.openai.chat"
      set frontmost to true
      set composerReady to false
      repeat 40 times
        try
          set focusedElement to value of attribute "AXFocusedUIElement"
          set focusedRole to value of attribute "AXRole" of focusedElement
          if focusedRole is "AXTextArea" or focusedRole is "AXTextField" then
            set value of attribute "AXValue" of focusedElement to composerText
            if value of attribute "AXValue" of focusedElement is composerText then
              set composerReady to true
              exit repeat
            end if
          end if
        end try
        delay 0.25
      end repeat
      if composerReady is false then error "ChatGPT composer did not accept text"
    end tell
  end tell
end run
`;

  const submitPromptScript = String.raw`
tell application "System Events"
  tell first application process whose bundle identifier is "com.openai.chat"
    set frontmost to true
    key code 36
  end tell
end tell
`;

  // The new ChatGPT app (com.openai.codex) remembers the last Chat/Work mode.
  // ChatGPT Classic is the supported chat-only client, so target its bundle ID.
  await execFileAsync("/usr/bin/open", ["-b", "com.openai.chat"]);
  await execFileAsync("/usr/bin/osascript", ["-e", focusComposerScript]);

  // Write directly to the focused accessibility element. This avoids touching
  // the global clipboard, including file, image, and rich-text contents.
  await execFileAsync("/usr/bin/osascript", [
    "-e",
    setComposerTextScript,
    prompt,
  ]);
  await execFileAsync("/usr/bin/osascript", ["-e", submitPromptScript]);
}

export default async function Command(props: { arguments: Arguments }) {
  try {
    const question = props.arguments.question?.trim();

    let selectedText: string | undefined;
    if (!question) {
      try {
        selectedText = (await getSelectedText()).trim();
      } catch {
        selectedText = undefined;
      }
    }

    const content = question || selectedText;
    if (!content) {
      await showHUD("请先选中文字，或输入你想问 GPT 的问题");
      return;
    }

    const prompt = makePrompt(content);

    await sendToChatGPT(prompt);
    await showHUD("已向 ChatGPT 发送联网搜索请求");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await showToast({
      style: Toast.Style.Failure,
      title: "无法发送选中文字",
      message: message.includes("not allowed assistive access")
        ? "请在系统设置 → 隐私与安全性 → 辅助功能中允许 Raycast"
        : message,
    });
  }
}
