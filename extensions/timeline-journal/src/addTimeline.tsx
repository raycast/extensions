import { ActionPanel, Form, Action, Icon, showToast, Toast, popToRoot, getPreferenceValues } from "@raycast/api";
import fs from "fs";
import { dateFormat, timeFormat } from "./utils/dateAndTime";
import { useForm, FormValidation } from "@raycast/utils";

interface TimelineFormValues {
  addTimeline: string;
}
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
  };

  const { handleSubmit, itemProps } = useForm<TimelineFormValues>({
    onSubmit(values) {
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
      showToast(Toast.Style.Success, "Added to Today's Timeline.");
      popToRoot({ clearSearchBar: true });
    },
    validation: {
      addTimeline: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add to Timeline" icon={Icon.PlusCircle} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea title="Add to Timeline" placeholder="Share your thoughts" {...itemProps.addTimeline} />
    </Form>
  );
}
