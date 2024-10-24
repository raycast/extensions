import {
  Form,
  ActionPanel,
  Action,
  showToast,
  getPreferenceValues,
  Cache,
  launchCommand,
  LaunchType,
  Toast,
  LaunchProps,
} from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import fs from "fs";
import path from "path";

type CreateFormValues = {
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

function createSlidesFile(values: CreateFormValues) {
  const { title, theme, paginate } = values;
  let content = values.content;
  const fileName = `${title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.md`;
  const filePath = path.join(preferences.slidesDirectory.replace("~", process.env.HOME || ""), fileName);

  if (!content.startsWith("---")) {
    content = `---\nmarp:true\ntheme: ${theme}\npaginate: ${paginate ? "true" : "false"}\n---\n\n` + content;
  }

  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content);
    cache.set("selectedSlides", fileName);
    launchCommand({ name: "preview-markdown-slides", type: LaunchType.UserInitiated, context: { file: fileName } });
    showToast({ title: "Presentation created", message: `File saved as ${fileName}` });
  } catch (error) {
    console.error("Error writing file:", error);
    showToast({ title: "Error", message: "Failed to create presentation", style: Toast.Style.Failure });
  }
}

export default function Command(props: LaunchProps<{ draftValues: CreateFormValues }>) {
  const { draftValues } = props;

  const { handleSubmit, itemProps } = useForm<CreateFormValues>({
    onSubmit: createSlidesFile,
    validation: {
      title: FormValidation.Required,
    },
  });

  return (
    <Form
      enableDrafts
      searchBarAccessory={
        <Form.LinkAccessory
          target="https://github.com/marp-team/marp-core/tree/main/themes"
          text="Marp Theming Documentation"
        />
      }
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create File" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Create a new markdown slides presentation" />
      <Form.TextField
        title="Title"
        placeholder="Enter presentation title"
        defaultValue={draftValues?.title}
        {...itemProps.title}
      />
      <Form.TextArea
        title="Content"
        placeholder="Enter content"
        info={
          "Pages are separated by " +
          (preferences.pageSeparator === "ruler" ? "horizontal rule (---)" : "three line breaks")
        }
        defaultValue={draftValues?.content}
        {...itemProps.content}
      />
      <Form.Separator />
      <Form.Description title="Export Options" text="Used when generating a printable HTML presentation" />
      <Form.Dropdown
        title="Theme"
        defaultValue={draftValues?.content || "default"}
        info="Choose a built-in theme for the exported presentation. Check the linked documentation above for more information and styling options."
        {...itemProps.theme}
      >
        <Form.Dropdown.Item value="default" title="Default" />
        <Form.Dropdown.Item value="gaia" title="Gaia" />
        <Form.Dropdown.Item value="uncover" title="Uncover" />
      </Form.Dropdown>
      <Form.Checkbox title="Paginate" label="Show page numbers in the exported presentation" {...itemProps.paginate} />
      <Form.Description text="Your selection will be stored in the Markdown front matter and can easily be updated by editing the file" />
    </Form>
  );
}
