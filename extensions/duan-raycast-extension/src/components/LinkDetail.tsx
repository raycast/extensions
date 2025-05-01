import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import type { Link } from "../types";
import { updateLink } from "../services/api";
import { urlValidation } from "../services/validation";

interface LinkDetailProps {
  link: Link;
  onRefresh: () => void;
}

interface FormValues {
  url: string;
  is_enabled: boolean;
  description?: string;
}

export const LinkDetail = ({ link, onRefresh }: LinkDetailProps) => {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<FormValues>({
    validation: {
      url: (value) => {
        const result = urlValidation.format(value);
        if (!result.isValid) return result.message;
      },
    },
    async onSubmit(values) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Updating link...",
      });

      try {
        await updateLink(link.short_code, {
          url: values.url,
          is_enabled: values.is_enabled ? 1 : 0,
          description: values.description || null,
        });

        toast.style = Toast.Style.Success;
        toast.title = "Link updated successfully";

        onRefresh(); // 更新后重新获取 links list
        pop(); // 更新成功后返回上一级
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to update link";
        toast.message = error instanceof Error ? error.message : "Unknown error occurred";
      }
    },
    // 使用传入的 link 对象的值作为表单的初始值
    initialValues: {
      url: link.original_url, // 使用原始 URL
      is_enabled: link.is_enabled === 1, // 转换数字为布尔值
      description: link.description || "", // 如果 description 为 null 则使用空字符串
    },
  });

  return (
    <Form
      navigationTitle="Edit Link"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Link" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Slug" text={link.short_code} />
      <Form.TextField {...itemProps.url} title="URL" placeholder="https://a-very-long-url.com" />
      <Form.Checkbox {...itemProps.is_enabled} title="Status" label="Enable this link" />
      <Form.TextField {...itemProps.description} title="Description" placeholder="Optional description for this link" />
    </Form>
  );
};
