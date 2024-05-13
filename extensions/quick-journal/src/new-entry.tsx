import { Form, ActionPanel, Action, showToast, ToastStyle, popToRoot, getPreferenceValues } from "@raycast/api";
import fs from "fs";
import path from "path";
import { format } from "date-fns";

interface Preferences {
  journalFolderPath: string;
}

interface FormValues {
  entryTitle: string;
  entry: string;
}

const preferences = getPreferenceValues<Preferences>();
const homeDirectory = process.env.HOME || "/";
const journalPath = preferences.journalFolderPath || path.join(homeDirectory, "Documents/Quick Journal");

export default function Command() {
  const handleSubmit = async (values: FormValues) => {
    try {
      const filePath = path.join(journalPath, `${values.entryTitle}.md`);
      await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
      await fs.promises.writeFile(filePath, values.entry);
      showToast(ToastStyle.Success, "Journal entry saved successfully!");
      await popToRoot();
    } catch (error) {
      showToast(ToastStyle.Failure, "Journal entry save failed!");
      console.log(error);
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Entry" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="entryTitle"
        title="Title"
        defaultValue={`Journal Entry - ${format(new Date(), "MMMM dd, yyyy HH-mm-ss")}`}
      />
      <Form.TextArea id="entry" title="Entry" placeholder="Write here..." autoFocus />
    </Form>
  );
}
