import { Form, ActionPanel, Action, showToast, getPreferenceValues, Cache, launchCommand, LaunchType, ToastStyle, Toast } from "@raycast/api";
import fs from "fs";
import path from "path";

type Values = {
  title: string;
  content: string;
  theme: string;
  paginate: boolean;
};

interface Preferences {
  slidesDirectory: string;
  pageSeparator: string;
}

const preferences = getPreferenceValues<Preferences>();
const cache = new Cache();

export default function Command() {
  function handleSubmit(values: Values) {
    let { title, content, theme, paginate } = values;
    const fileName = `${title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.md`;
    const filePath = path.join(preferences.slidesDirectory.replace("~", process.env.HOME || ""), fileName);

    if (!content.startsWith("---")) {
      content = `---\ntheme: ${theme}\npaginate: ${paginate ? 'true' : 'false'}\n---\n\n` + content;
    }

    try {
      fs.writeFileSync(filePath, content);
      cache.set("selectedSlides", fileName);
      launchCommand({ name: "preview-markdown-slides", type: LaunchType.UserInitiated, context: { file: fileName } });
      showToast({ title: "Presentation created", message: `File saved as ${fileName}` });
    } catch (error) {
      console.error("Error writing file:", error);
      showToast({ title: "Error", message: "Failed to create presentation", style: Toast.Style.Failure });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Create a new markdown slides presentation" />
      <Form.TextField id="title" title="Presentation Title" placeholder="Enter presentation title" />
      <Form.TextArea id="content" title="Content" placeholder="Enter content" info={"Pages are separated by " + (preferences.pageSeparator === '---' ? 'horizontal rule (---)' : 'two line breaks')} />
      <Form.Dropdown id="theme" title="Theme" defaultValue="default">
        <Form.Dropdown.Item value="default" title="Default" />
        <Form.Dropdown.Item value="gaia" title="Gaia" />
        <Form.Dropdown.Item value="uncover" title="Uncover" />
      </Form.Dropdown>
      <Form.Checkbox id="paginate" title="Paginate" label="Enable pagination of slides" />
    </Form>
  );
}
