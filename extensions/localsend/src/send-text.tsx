import { Form, ActionPanel, Action, showToast, Toast, useNavigation, Icon } from "@raycast/api";
import { useState } from "react";
import { sendFiles } from "./utils/localsend";
import SendToDevice from "./send-to-device";

interface FormValues {
  text: string;
}

export default function Command() {
  const { push } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (values: FormValues) => {
    if (!values.text || values.text.trim().length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No text entered",
        message: "Please enter some text to send",
      });
      return;
    }

    setIsLoading(true);

    try {
      const fs = await import("node:fs/promises");
      const os = await import("node:os");
      const path = await import("node:path");

      // Create temporary text file
      const tmpDir = os.tmpdir();
      const timestamp = Date.now();
      const fileName = `text-${timestamp}.txt`;
      const filePath = path.join(tmpDir, fileName);

      await fs.writeFile(filePath, values.text, "utf-8");
      const stats = await fs.stat(filePath);

      const textFile = {
        path: filePath,
        name: fileName,
        size: stats.size,
        type: "text/plain",
      };

      push(<SendToDevice files={[textFile]} onSend={sendFiles} />);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to process text",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Select Device" icon={Icon.Upload} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="text" title="Text to Send" placeholder="Enter text to send..." />
      <Form.Description text="Enter text that will be sent as a .txt file" />
    </Form>
  );
}
