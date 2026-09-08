import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { useState } from "react";
import { getFinderTarget, openInVisualStudioCode } from "./macos";

type OpenInVisualStudioCodeValues = {
  path?: string;
};

export default function OpenInVisualStudioCodeCommand() {
  const [isLoading, setIsLoading] = useState(false);

  async function openTarget(values: OpenInVisualStudioCodeValues) {
    setIsLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "正在打开 VS Code",
    });

    try {
      const target = values.path?.trim() || (await getFinderTarget());
      await openInVisualStudioCode(target);
      toast.style = Toast.Style.Success;
      toast.title = "已在 VS Code 中打开";
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "无法打开 VS Code",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="用 VS Code 打开"
            icon={Icon.Code}
            onSubmit={openTarget}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="path"
        title="路径"
        placeholder="留空时使用 Finder 当前选中项或当前目录"
        info="可输入绝对路径或以 ~ 开头的用户目录路径。"
      />
    </Form>
  );
}
