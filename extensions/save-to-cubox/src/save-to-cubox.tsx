import {
  Form,
  ActionPanel,
  Action,
  showToast,
  getPreferenceValues,
  Toast,
  openExtensionPreferences,
} from "@raycast/api";
import axios from "axios";
import { useForm } from "@raycast/utils";

type SubmitFormValues = {
  type: string;
  content: string;
  title: string;
  description: string;
  tags: string;
  folder: string;
};

const contentInfoMap: Record<string, string> = {
  url: "Complete url, including protocol like http:// or https://",
  memo: "Pure text, less than 3000 characters",
};

export default function Command() {
  const preferences: Preferences = getPreferenceValues();

  const { handleSubmit, itemProps, reset, values } = useForm<SubmitFormValues>({
    async onSubmit(values: SubmitFormValues) {
      const { type, content, title, description, tags, folder } = values;

      let tagList: string[] = [];

      const { api } = preferences;

      if (!api.startsWith("https://")) {
        showToast({ title: "Save to Cubox", message: "Cubox API is incorrect", style: Toast.Style.Failure });
        return;
      }

      try {
        tagList = tags.split(" ");
      } catch (error) {
        showToast({ title: "Save to Cubox", message: "Tags is not valid", style: Toast.Style.Failure });
        return;
      }

      if (type === "url" && !content.startsWith("http")) {
        showToast({ title: "Save to Cubox", message: "Url is not valid", style: Toast.Style.Failure });
        return;
      }

      if (content !== "") {
        try {
          const response = await axios.post(api, {
            type: type,
            content: content,
            title: title,
            description: description,
            tags: tagList,
            folder: folder,
          });

          if (response.data.code === 200) {
            showToast({ title: "Save to Cubox", message: "Success" });
            reset();
          } else {
            showToast({
              title: "Save to Cubox",
              message: response.data.message || "Unknown error",
              style: Toast.Style.Failure,
            });
          }
        } catch (error) {
          showToast({ title: "Save to Cubox", message: error as string, style: Toast.Style.Failure });
        }
      } else {
        showToast({ title: "Save to Cubox", message: "Content is empty", style: Toast.Style.Failure });
      }
    },
    validation: {
      content: (value) => {
        if (value === "") {
          return "Content is required";
        }
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Save" />
          <Action title="Open Preference" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
      navigationTitle="Save to Cubox"
    >
      <Form.Dropdown title="Type" {...itemProps.type}>
        <Form.Dropdown.Item value="url" title="url" />
        <Form.Dropdown.Item value="memo" title="memo" />
      </Form.Dropdown>
      <Form.TextArea
        title="Content"
        placeholder={`Enter ${values.type == undefined || values.type == "url" ? "URL" : values.type}`}
        info={contentInfoMap[values.type]}
        {...itemProps.content}
      />
      <Form.Separator />
      <Form.TextField title="Card Title" placeholder="Optional" {...itemProps.title} />
      <Form.TextArea title="Card Description" placeholder="Optional" {...itemProps.description} />
      <Form.TextField title="Tags" placeholder="Separated by space, optional" {...itemProps.tags} />
      <Form.TextField title="Folder" placeholder="Optional" {...itemProps.folder} />
    </Form>
  );
}
