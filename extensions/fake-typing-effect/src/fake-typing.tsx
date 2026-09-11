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
import { parseScript, typeWithDelay, showCountdown } from "./utils/typing";

interface FormValues {
  script: string;
  baseDelay: string;
}

export default function Command() {
  const [isTyping, setIsTyping] = useState(false);

  async function handleSubmit(values: FormValues) {
    const preferences = getPreferenceValues();

    const script = values.script.trim();
    if (!script) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Script is empty",
        message: "Please enter a script to type",
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
      const tokens = parseScript(script);

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
        </ActionPanel>
      }
      isLoading={isTyping}
    >
      <Form.TextArea
        id="script"
        title="Script"
        placeholder="[1]Hello everyone, [0.7]this is an extension"
        info="Use [0.1] for 100ms delay, [2] for 2 seconds, etc. Escape brackets with \[."
      />
      <Form.TextField
        id="baseDelay"
        title="Base Typing Delay (ms)"
        placeholder="50"
        defaultValue="50"
        info="Delay between each character in milliseconds (default: 50ms)"
      />
      <Form.Description
        title="How to use"
        text="1. Enter your script with delay markers like [0.5] for 500ms or [2] for 2 seconds
2. Set base typing speed (time between characters)
3. Click 'Start Typing' and you'll have 3 seconds to focus your target window
4. The extension will type out your script automatically

Example: '[1]Hello everyone, [0.7]this is a demo[2]... pretty cool right?'

Special keys: [enter] [tab] [escape] [space] [delete]
Modifiers: [cmd+c] [ctrl+c] [alt+tab] [shift+tab]
Multi-modifier: [cmd+shift+t] [ctrl+alt+delete]
Speed control: [speed:20] for fast, [speed:100] for slow, [speed:default] to reset

Tip: Use \[ to type a literal bracket character"
      />
    </Form>
  );
}
