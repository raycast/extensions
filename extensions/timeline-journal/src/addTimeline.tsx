import { ActionPanel, Form, Action, getPreferenceValues, showToast, Toast } from "@raycast/api";
import fs from "fs";
import { useState } from "react";
import {dateFormat, timeFormat} from "./utils/dateAndTime";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const folderPath = preferences.folderPath + "/";
  const formattedDate = dateFormat();
  const filePath = folderPath + formattedDate + ".md";
  const fileExists = fs.existsSync(filePath); // Check if file exist

  // Create file if it doesn't exist
  if (!fileExists) {
    fs.writeFileSync(filePath, "");
  }

  const getFormattedTime = timeFormat();
  const formatBulletPoint = (text: string) => `- ${getFormattedTime} - ${text}`;
  const updateFileContent = (newContent: string | NodeJS.ArrayBufferView) => {
    fs.writeFileSync(filePath, newContent);
  }
  
  const [textareaValue, setTextareaValue] = useState("");

  const handleFormSubmit = (values: { addTimeline: string }) => {
    const newText = values.addTimeline.trim();
    if (newText === "") return;

    const newBulletPoint = formatBulletPoint(newText);
    const currentContent = fs.readFileSync(filePath, "utf-8");

    // Insert new bullet point at the top or bottom of the file
    if (preferences.insertPosition === "append") {
      updateFileContent(currentContent + `\n${newBulletPoint}`);
    } else {
      updateFileContent(`${newBulletPoint}\n${currentContent}`);
    }
    showToast(Toast.Style.Success, "Added to Today's Timeline");
    setTextareaValue("");
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add to Timeline" onSubmit={handleFormSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea 
        id="addTimeline" 
        title="Add to Timeline" 
        placeholder="Share your thoughts" 
        value={textareaValue} 
        onChange={setTextareaValue}
      />
    </Form>
  );
}
