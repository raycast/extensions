import { useState } from "react";
import { Action, ActionPanel, Clipboard, Form, showToast, Toast, Detail } from "@raycast/api";
import { formatRawSql } from "./utils";

export default function FormatSqlCommand() {
  const [sqlInput, setSqlInput] = useState<string>("");
  const [formattedSql, setFormattedSql] = useState<string>("");
  const [showDetail, setShowDetail] = useState<boolean>(false);

  const handleSubmit = (values: { sqlInput: string }) => {
    try {
      if (!values.sqlInput.trim()) {
        showToast({
          style: Toast.Style.Failure,
          title: "请输入SQL语句",
        });
        return;
      }

      const formatted = formatRawSql(values.sqlInput);
      setFormattedSql(formatted);

      showToast({
        style: Toast.Style.Success,
        title: "SQL已格式化",
      });

      // 自动显示详情页面
      setShowDetail(true);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "发生错误",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  // 如果显示详情页面
  if (showDetail && formattedSql) {
    return (
      <Detail
        markdown={`

\`\`\`sql
${formattedSql}
\`\`\`
`}
        actions={
          <ActionPanel>
            <Action
              title="Copy Formatted Sql"
              onAction={() => {
                Clipboard.copy(formattedSql);
                showToast({ title: "已复制到剪贴板" });
              }}
            />
            <Action title="返回输入表单" onAction={() => setShowDetail(false)} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Format Sql" onSubmit={handleSubmit} />
          {formattedSql && (
            <>
              <Action title="查看格式化Sql" onAction={() => setShowDetail(true)} />
              <Action
                title="Copy Formatted Sql"
                onAction={() => {
                  Clipboard.copy(formattedSql);
                  showToast({ title: "已复制到剪贴板" });
                }}
              />
            </>
          )}
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="sqlInput"
        title="SQL语句"
        placeholder="请输入需要格式化的SQL语句..."
        value={sqlInput}
        onChange={setSqlInput}
      />
      {formattedSql && (
        <Form.TextArea
          id="formattedSql"
          title="格式化结果"
          value={formattedSql}
          onChange={() => {}} // 添加空的onChange处理器使其只读
          enableMarkdown={true} // 启用Markdown支持以获得语法高亮
        />
      )}
    </Form>
  );
}
