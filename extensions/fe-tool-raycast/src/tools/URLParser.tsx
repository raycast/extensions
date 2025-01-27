import { ActionPanel, Form, Action, showToast, Toast, Clipboard } from "@raycast/api";
import { useState } from "react";

export default function URLParser() {
  const [url, setUrl] = useState("");
  const [action, setAction] = useState<"encode" | "decode">("encode");
  const [result, setResult] = useState("");

  const handleSubmit = async () => {
    if (!url) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "请输入URL",
      });
      return;
    }

    try {
      let processedResult = "";
      if (action === "encode") {
        processedResult = encodeURIComponent(url);
      } else {
        processedResult = decodeURIComponent(url);
      }

      setResult(processedResult);

      // 复制结果到剪贴板
      await Clipboard.copy(processedResult);

      // 显示成功提示
      await showToast({
        style: Toast.Style.Success,
        title: "Success",
        message: "Result copied to clipboard!",
      });
    } catch (error) {
      // 显示错误提示
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Invalid URL or input",
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="action"
        title="Action"
        value={action}
        onChange={(newValue) => setAction(newValue as "encode" | "decode")}
      >
        <Form.Dropdown.Item title="Encode" value="encode" />
        <Form.Dropdown.Item title="Decode" value="decode" />
      </Form.Dropdown>
      <Form.TextArea id="url" title="URL" placeholder="Enter URL to encode/decode..." value={url} onChange={setUrl} />
      {result.length > 0 && <Form.TextArea id="result" title="Result" value={result} onChange={setResult} />}
    </Form>
  );
}
