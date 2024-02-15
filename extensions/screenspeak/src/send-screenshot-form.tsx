import { useEffect, useState } from "react";
import { showToast, Toast, Clipboard, ActionPanel, Form, Action, closeMainWindow } from "@raycast/api";

import { captureScreenshot, sendScreenshotToGPTVision } from "./utils";

export default function Command() {
  const [voiceCommand, setVoiceCommand] = useState("");

  useEffect(() => {
    (async () => {
      const voiceCommand = await Clipboard.read();

      if (voiceCommand) {
        setVoiceCommand(voiceCommand.text);
      }
    })();
  }, []);

  const handleSubmit = async () => {
    try {
      console.log("Voice command", voiceCommand);

      await closeMainWindow();

      const screenshotPath = await captureScreenshot();

      console.log("Captured screenshot at", screenshotPath);

      const imageResult = await sendScreenshotToGPTVision(screenshotPath, voiceCommand);

      console.log("Image result", imageResult);

      await Clipboard.copy(imageResult);

      console.log("Copied to clipboard", imageResult);

      await showToast({ title: "Result", message: "Copied to clipboard", style: Toast.Style.Success });
    } catch (error) {
      console.error("Error", error);

      await showToast({ title: "Error", message: String(error), style: Toast.Style.Failure });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Screenshot" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="voice-input"
        title="Voice Command"
        value={voiceCommand}
        onChange={setVoiceCommand}
        placeholder="Enter your voice command here"
      />
    </Form>
  );
}
