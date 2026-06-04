import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  closeMainWindow,
  getPreferenceValues,
} from "@raycast/api";
import { useState } from "react";
import { readFile } from "fs/promises";
import { parseScript, typeWithDelay, showCountdown } from "./utils/typing";

interface FormValues {
  filePath: string[];
  baseDelay: string;
}

export default function Command() {
  const [isTyping, setIsTyping] = useState(false);
  const [scriptContent, setScriptContent] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");

  async function handleFileSelect(files: string[]) {
    if (files.length === 0) return;

    const filePath = files[0];
    setFileName(filePath.split("/").pop() || "");

    try {
      const content = await readFile(filePath, "utf-8");
      setScriptContent(content);

      await showToast({
        style: Toast.Style.Success,
        title: "File loaded",
        message: `${content.length} characters`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to read file",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      setScriptContent("");
      setFileName("");
    }
  }

  async function handleSubmit(values: FormValues) {
    const preferences = getPreferenceValues();

    if (!scriptContent) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No file selected",
        message: "Please select a script file",
      });
      return;
    }

    const baseDelay = parseInt(values.baseDelay) || 50;
    if (baseDelay < 0 || baseDelay > 1000) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid base delay",
        message: "Base delay must be between 0 and 1000ms",
      });
      return;
    }

    const countdownDuration = parseInt(preferences.countdownDuration) || 3;
    if (countdownDuration < 0 || countdownDuration > 10) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid countdown duration",
        message: "Countdown must be between 0 and 10 seconds",
      });
      return;
    }

    setIsTyping(true);
    const showToastsEnabled = preferences.showToasts !== false;

    try {
      // Close window first
      await closeMainWindow();

      // Show countdown
      await showCountdown(countdownDuration, showToastsEnabled);

      // Parse the script
      const tokens = parseScript(scriptContent);

      // Start typing
      await typeWithDelay(tokens, baseDelay, showToastsEnabled);
    } catch (error) {
      if (showToastsEnabled) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Typing failed",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    } finally {
      setIsTyping(false);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Start Typing" onSubmit={handleSubmit} />
          {scriptContent && !isTyping && (
            <Action
              title="Preview Script"
              onAction={async () => {
                await showToast({
                  style: Toast.Style.Success,
                  title: "Script Preview",
                  message:
                    scriptContent.slice(0, 100) +
                    (scriptContent.length > 100 ? "..." : ""),
                });
              }}
            />
          )}
        </ActionPanel>
      }
      isLoading={isTyping}
    >
      <Form.FilePicker
        id="filePath"
        title="Script File"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        onChange={handleFileSelect}
        info="Select a text file containing your script with delay markers"
      />
      {fileName && <Form.Description title="Selected File" text={fileName} />}
      {scriptContent && (
        <Form.Description
          title="Script Preview"
          text={
            scriptContent.slice(0, 200) +
            (scriptContent.length > 200 ? "..." : "")
          }
        />
      )}
      <Form.TextField
        id="baseDelay"
        title="Base Typing Delay (ms)"
        placeholder="50"
        defaultValue="50"
        info="Delay between each character in milliseconds (default: 50ms)"
      />
      <Form.Description
        title="How to use"
        text="1. Select a text file containing your script with delay markers
2. The file will be loaded automatically
3. Set base typing speed (time between characters)
4. Click 'Start Typing' and you'll have 3 seconds to focus your target window
5. The extension will type out your script automatically

Delay markers: [0.5] for 500ms, [2] for 2 seconds, etc.
Special keys: [enter] [tab] [escape] [space] [delete]
Modifiers: [cmd+c] [ctrl+c] [alt+tab] [shift+tab]
Multi-modifier: [cmd+shift+t] [ctrl+alt+delete]
Speed control: [speed:20] for fast, [speed:100] for slow, [speed:default] to reset
Escape brackets: Use \[ to type a literal bracket

Example file content:
[1]Hello everyone, [0.7]this is a demo[2]... pretty cool right?"
      />
    </Form>
  );
}
