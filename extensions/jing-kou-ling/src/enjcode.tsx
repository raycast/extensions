import { Form, ActionPanel, Action, showToast, Toast, Clipboard } from "@raycast/api";
import axios from "axios";
import { useState } from "react";

export default function Command() {
  const [formLoading, setFormLoading] = useState(false);

  async function handleSubmit(values: { title: string; url: string }) {
    if (!values.url) {
      return showToast({ title: "参数不完整", message: "请输入需要生成口令的链接提交", style: Toast.Style.Failure });
    }
    if (!values.title) {
      values.title = "动物园欢迎您";
    }
    setFormLoading(true);
    const { data } = await axios.post("https://api.jds.codes/jd/gencode", { ...values });
    if (data.code === 200) {
      setFormLoading(false);
      Clipboard.copy(data.data.code)
      showToast({ title: "生成成功", message: "口令已复制到剪贴板", style: Toast.Style.Success });
    } else {
      setFormLoading(false);
      showToast({ title: "生成失败", message: data.msg, style: Toast.Style.Failure });
    }
  }

  return (
    <>
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm onSubmit={handleSubmit} title="生成" />
          </ActionPanel>
        }
        isLoading={formLoading}
      >
        <Form.Description title="生成京口令" text="生成自己的京口令" />
        <Form.TextField id="title" title="口令标题" placeholder="请输入你需要生成的口令的标题" />
        <Form.TextField id="url" title="口令链接" placeholder="请输入你需要生成的口令的的链接" />
      </Form>
    </>
  );
}
