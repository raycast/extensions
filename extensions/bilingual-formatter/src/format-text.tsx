import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Clipboard,
} from "@raycast/api";
import { FormatterService } from "./services/formatter-service";
import { ErrorHandler } from "./services/error-handler";
import { Logger } from "./utils/logger";
import { useState } from "react";

interface FormValues {
  text: string;
}

export default function Command() {
  const [text, setText] = useState("");

  async function handleSubmit(values: FormValues) {
    if (!values.text) {
      showToast({ style: Toast.Style.Failure, title: "请输入文本" });
      return;
    }

    try {
      Logger.log("FormatText: Starting");
      const formatter = new FormatterService();
      const formatted = formatter.format(values.text);

      await Clipboard.copy(formatted);

      showToast({
        style: Toast.Style.Success,
        title: "格式化完成",
        message: "已复制到剪贴板",
      });
    } catch (error) {
      const errorMessage = ErrorHandler.handle(error as Error, "FormatText");
      showToast({
        style: Toast.Style.Failure,
        title: "格式化失败",
        message: errorMessage,
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="格式化并复制" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title="文本内容"
        placeholder="在此输入或粘贴需要格式化的文本..."
        value={text}
        onChange={setText}
      />
    </Form>
  );
}
