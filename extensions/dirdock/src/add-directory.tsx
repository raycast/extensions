import { Action, ActionPanel, Form, showToast, Toast, Icon } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { addDirectory, getTags, Tag } from "./utils/storage";
import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { colorEmojiMap } from "./utils/colorEmojiMap"; // 导入颜色到 emoji 的映射

export default function AddDirectoryCommand() {
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [loadingTags, setLoadingTags] = useState(true);

  useEffect(() => {
    async function fetchTags() {
      try {
        const tags = await getTags();
        setAvailableTags(tags);
        // itemProps.tags.validation = validateTags;
      } catch (error: unknown) {
        if (error instanceof Error) {
          showToast(Toast.Style.Failure, "Failed to Load Tags", error.message);
        } else {
          showToast(Toast.Style.Failure, "Failed to Load Tags", "An unknown error occurred.");
        }
      } finally {
        setLoadingTags(false);
      }
    }

    fetchTags();
  }, []);

  // 定义带有类型声明的标签验证函数
  const validateTags = (tags: string[] | undefined): string | undefined => {
    if (!tags || tags.length === 0) {
      return "Please select at least one tag.";
    }
    const invalidTags = tags.filter((tagId) => !availableTags.some((tag) => tag.id === tagId));
    if (invalidTags.length > 0) {
      console.error("Invalid tags selected:", invalidTags);
      return "One or more selected tags are invalid.";
    }
    return undefined;
  };

  const { handleSubmit, itemProps } = useForm<{
    name: string;
    path: string[];
    tags: string[];
  }>({
    async onSubmit(values) {
      try {
        const newDirectory = {
          id: uuidv4(),
          name: values.name,
          path: values.path[0], // 获取已选择的第一个目录路径
          tags: values.tags,
        };
        await addDirectory(newDirectory);
        showToast(Toast.Style.Success, "Directory Added", `${newDirectory.name} has been added.`);
      } catch (error: unknown) {
        console.error("Error adding directory:", error);
        if (error instanceof Error) {
          showToast(Toast.Style.Failure, "Failed to Add Directory", error.message);
        } else {
          showToast(Toast.Style.Failure, "Failed to Add Directory", "An unknown error occurred.");
        }
      }
    },
    validation: {
      name: FormValidation.Required,
      path: FormValidation.Required,
      tags: validateTags,
    },
  });

  return (
    <Form
      isLoading={loadingTags}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Directory" onSubmit={handleSubmit} icon={Icon.Plus} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Directory Name" placeholder="e.g., Projects" {...itemProps.name} />
      <Form.FilePicker
        title="Directory Path"
        {...itemProps.path}
        canChooseDirectories={true}
        canChooseFiles={false}
        allowMultipleSelection={false}
      />
      <Form.TagPicker title="Tags" {...itemProps.tags}>
        {availableTags.map((tag) => (
          <Form.TagPicker.Item
            key={tag.id}
            value={tag.id}
            title={tag.name}
            icon={colorEmojiMap[tag.color] || Icon.Tag}
          />
        ))}
      </Form.TagPicker>
      {itemProps.tags.error && <Form.Description title="Error" text={itemProps.tags.error} />}
    </Form>
  );
}
