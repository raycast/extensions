import {
  Clipboard,
  getSelectedText,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

interface Arguments {
  question: string;
}

function makePrompt(question: string, selectedText?: string): string {
  const actualQuestion = question.trim();
  const actualSelection = selectedText?.trim();

  if (!actualSelection) {
    return actualQuestion;
  }

  return `${actualQuestion}\n\n选中的内容：\n${actualSelection}`;
}

async function sendToChatGPT(prompt: string): Promise<void> {
  const focusComposerScript = String.raw`
tell application id "com.openai.chat" to activate
delay 0.8
tell application "System Events"
  tell first application process whose bundle identifier is "com.openai.chat"
    set frontmost to true
    keystroke "n" using command down
    set composerReady to false
    repeat 40 times
      try
        set focusedElement to value of attribute "AXFocusedUIElement"
        set focusedRole to value of attribute "AXRole" of focusedElement
        if focusedRole is "AXTextArea" or focusedRole is "AXTextField" then
          set composerReady to true
          exit repeat
        end if
      end try
      delay 0.25
    end repeat
    if composerReady is false then error "ChatGPT composer did not become ready"
  end tell
end tell
`;

  const pressReturnScript = String.raw`
tell application "System Events"
  tell first application process whose bundle identifier is "com.openai.chat"
    set frontmost to true
    key code 36
    delay 0.8
  end tell
end tell
`;

  // The new ChatGPT app (com.openai.codex) remembers the last Chat/Work mode.
  // ChatGPT Classic is the supported chat-only client, so target its bundle ID.
  await execFileAsync("/usr/bin/open", ["-b", "com.openai.chat"]);
  await execFileAsync("/usr/bin/osascript", ["-e", focusComposerScript]);

  // Clipboard.paste waits for each paste operation and preserves the user's
  // clipboard, avoiding races caused by swapping global clipboard contents.
  await Clipboard.paste("/search");
  await execFileAsync("/usr/bin/osascript", ["-e", pressReturnScript]);

  await Clipboard.paste(prompt);
  await execFileAsync("/usr/bin/osascript", ["-e", pressReturnScript]);
}

export default async function Command(props: { arguments: Arguments }) {
  try {
    const question = props.arguments.question.trim();
    if (!question) {
      await showHUD("请输入你想问 GPT 的问题");
      return;
    }

    let selectedText: string | undefined;
    try {
      selectedText = await getSelectedText();
    } catch {
      // Manual questions work even when the current app has no text selection.
      selectedText = undefined;
    }

    const prompt = makePrompt(question, selectedText);

    await sendToChatGPT(prompt);
    await showHUD("已通过 ChatGPT Search 发送");
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
