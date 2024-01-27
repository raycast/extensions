// Action 和 ActionPanel：用于创建表单的提交按钮。
// Form：用于创建表单和表单的各个部分（如文本区域，下拉菜单，复选框）。
// LaunchProps：这是一个类型，用于描述传递给命令的属性。
// getPreferenceValues：这是一个函数，用于获取用户的偏好设置。
// open：这是一个函数，用于打开一个 URL。
// popToRoot：这是一个函数，用于在提交表单后关闭所有打开的面板，返回到 Raycast 的主屏幕
import { Action, ActionPanel, Form, LaunchProps, getPreferenceValues, open, popToRoot } from "@raycast/api";
import { useForm } from "@raycast/utils";

type Values = {
  query: string;
};

export default function Command(props: LaunchProps<{ draftValues: Values; arguments: Values }>) {
  const { handleSubmit, itemProps } = useForm<Values>({
    onSubmit(params) {
      popToRoot();
      open(`https://you.com/search?q=${params.query}&tbm=youchat`);
    },
    initialValues: {
      query: props.draftValues?.query ?? props.fallbackText ?? "",
    },
    validation: {
      query: (value) => (value && value.length > 0 ? null : "Query cannot be empty"),
    },
  });

  if (props.arguments.query) {
    handleSubmit({
      query: props.arguments.query,
    });
    return null;
  }

  if (props.fallbackText) {
    handleSubmit({
      query: props.fallbackText as string,
    });
    return null;
  }

  return (
    <Form
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="请使用 you 进行搜索" />
      <Form.TextArea title="Ask Anything" {...itemProps.query} />
    </Form>
  );
}
