// src/human-typing.tsx
import { Action, ActionPanel, Form, closeMainWindow, showHUD, popToRoot } from "@raycast/api";
import { promisify } from "node:util";
import { execFile as _execFile } from "node:child_process";

const execFile = promisify(_execFile);

type Values = {
  text: string;
  focusDelayMs: string; // after closing Raycast, before typing begins
  perCharDelayMs: string; // delay between characters
};

function clampNumber(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

async function typeTextSystemLevel(text: string, perCharDelayMs: number) {
  // AppleScript reads argv so we don't fight escaping/quotes/newlines.
  // Handles \n and \t explicitly; other chars typed via keystroke.
  const appleScript = `
on run argv
  set theText to item 1 of argv
  set perDelayMs to (item 2 of argv) as number
  set perDelay to perDelayMs / 1000

  tell application "System Events"
    repeat with i from 1 to (count characters of theText)
      set c to character i of theText

      if c is return or c is linefeed then
        key code 36 -- Return
      else if c is tab then
        key code 48 -- Tab
      else
        keystroke c
      end if

      if perDelay > 0 then delay perDelay
    end repeat
  end tell
end run
`;

  await execFile("/usr/bin/osascript", ["-e", appleScript, text, String(perCharDelayMs)], {
    env: { ...process.env, LANG: "en_US.UTF-8" },
  });
}

async function runTyping(values: Values) {
  const text = (values.text ?? "").toString();
  if (!text.trim()) {
    await showHUD("Please enter text to type.");
    return;
  }

  const focusDelayMs = clampNumber(parseInt(values.focusDelayMs || "1200", 10) || 1200, 0, 10000);
  const perCharDelayMs = clampNumber(parseInt(values.perCharDelayMs || "50", 10) || 50, 0, 500);

  try {
    await closeMainWindow();
    await new Promise((r) => setTimeout(r, focusDelayMs));

    await typeTextSystemLevel(text, perCharDelayMs);
    await showHUD("✅ Typed text");
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    await showHUD(`❌ Failed: ${msg}`);
  } finally {
    // ✅ 关键：不管成功失败，都回到 Raycast 根界面（下次打开不再停留在表单）
    await popToRoot({ clearSearchBar: true });
  }
}

export default function Command() {
  return (
    <Form
      navigationTitle="Human Typing"
      actions={
        <ActionPanel>
          {/* 使用 Keyboard.Shortcut 类型给 Action 绑定快捷键（这里设为 ⌘ + Enter） */}
          <Action.SubmitForm
            title="Type into Focused App"
            // shortcut={{ modifiers: ["cmd"], key: "enter" }}
            onSubmit={runTyping}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title="Text"
        placeholder="Enter the text to type (works even when paste is blocked)"
        autoFocus
      />

      <Form.Separator />

      <Form.TextField id="focusDelayMs" title="Delay Before Typing (ms)" defaultValue="1200" />
      <Form.Description text="Time to wait after closing Raycast so the previous app regains focus." />

      <Form.TextField id="perCharDelayMs" title="Delay Between Characters (ms)" defaultValue="50" />
      <Form.Description text="0–500 ms. Increase if the target app drops keystrokes." />
    </Form>
  );
}
