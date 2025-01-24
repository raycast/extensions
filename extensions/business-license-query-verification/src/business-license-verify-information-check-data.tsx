import { ActionPanel, Action, Form, showToast, Toast } from "@raycast/api";
import React from "react";
import { getConfig } from "./config";

interface FormValues {
  input: string;
}

interface CompanyInfo {
  name: string;
  code: string;
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

      const companies: CompanyInfo[] = values.input
        .split("\n")
        .map((line) => {
          const [name, code] = line.split(/[,，]/).map((s) => s.trim());
          return { name, code };
        })
        .filter((info) => info.name && info.code);

      if (companies.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "错误",
          message: "请输入至少一对企业名称和统一社会信用代码",
        });
        return;
      }

      // TODO: 调用百度 API 进行核验
      await showToast({
        style: Toast.Style.Success,
        title: "成功",
        message: `已提交 ${companies.length} 个企业的核验请求`,
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
          <Action.SubmitForm title="核验" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="input"
        title="输入企业信息"
        placeholder="请输入企业名称和统一社会信用代码，每行一对，用逗号分隔"
        value={inputText}
        onChange={setInputText}
        enableMarkdown={false}
      />
    </Form>
  );
};

export default Command;
