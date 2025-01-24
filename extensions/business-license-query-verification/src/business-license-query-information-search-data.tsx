import { ActionPanel, Action, Form, showToast, Toast } from "@raycast/api";
import React from "react";
import { getConfig } from "./config";

interface FormValues {
  input: string;
}

const Command: React.FC = () => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [inputText, setInputText] = React.useState("");

  const handleSubmit = async (values: FormValues) => {
    try {
      setIsLoading(true);
      const config = getConfig();

      if (!config.apiKey || !config.secretKey) {
        await showToast({
          style: Toast.Style.Failure,
          title: "错误",
          message: "请先在插件设置中配置 API Key 和 Secret Key",
        });
        return;
      }

      const companies = values.input
        .split(/[\n,，]/)
        .map((name) => name.trim())
        .filter((name) => name.length > 0);

      if (companies.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "错误",
          message: "请输入至少一个企业名称",
        });
        return;
      }

      // TODO: 调用百度 API 进行查询
      await showToast({
        style: Toast.Style.Success,
        title: "成功",
        message: `已提交 ${companies.length} 个企业的查询请求`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "错误",
        message: error instanceof Error ? error.message : "未知错误",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="查询" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="input"
        title="输入企业名称"
        placeholder="请输入企业名称，多个企业可用换行、逗号等符号分隔"
        value={inputText}
        onChange={setInputText}
        enableMarkdown={false}
      />
    </Form>
  );
};

export default Command;
