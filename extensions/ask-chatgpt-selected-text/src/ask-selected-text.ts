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
  const openSearchScript = String.raw`
tell application id "com.openai.chat" to activate
delay 0.8
tell application "System Events"
  tell first application process whose bundle identifier is "com.openai.chat"
    set frontmost to true
    keystroke "n" using command down
    delay 0.5
    keystroke "v" using command down
    delay 0.5
    key code 36
    delay 0.6
  end tell
end tell
`;

  const sendPromptScript = String.raw`
tell application "System Events"
  tell first application process whose bundle identifier is "com.openai.chat"
    set frontmost to true
    keystroke "v" using command down
    delay 0.2
    key code 36
  end tell
end tell
`;

  // The new ChatGPT app (com.openai.codex) remembers the last Chat/Work mode.
  // ChatGPT Classic is the supported chat-only client, so target its bundle ID.
  await execFileAsync("/usr/bin/open", ["-b", "com.openai.chat"]);

  // ChatGPT Classic supports slash commands. Selecting /search explicitly
  // enables web search before the user's prompt is submitted.
  await Clipboard.copy("/search");
  await execFileAsync("/usr/bin/osascript", ["-e", openSearchScript]);

  await Clipboard.copy(prompt);
  await execFileAsync("/usr/bin/osascript", ["-e", sendPromptScript]);
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

    const previousClipboard = await Clipboard.read();
    const prompt = makePrompt(question, selectedText);

    try {
      await sendToChatGPT(prompt);
      await showHUD("已通过 ChatGPT Search 发送");
    } finally {
      // Wait until ChatGPT has consumed the paste before restoring the clipboard.
      await new Promise((resolve) => setTimeout(resolve, 700));
      if (previousClipboard.text !== undefined) {
        await Clipboard.copy(previousClipboard.text);
      }
    }
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
