import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { t } from "../i18n.js";
import { showFailureToast } from "./failureToast.js";

interface RawContentFormProps {
  navTitle: string;
  initialContent: string;
  /** 编辑框下面的一句说明 */
  hint: string;
  submitTitle?: string;
  /** 返回 false 表示这次没有写入(比如用户在冲突框里选了放弃),表单留着,内容不丢 */
  onSave: (content: string) => Promise<boolean | void>;
}

/**
 * 一整份文本直接改。给两处用:方案的内容、环境文件的原文。
 * 都是**明文**——可编辑的文本框没法打码,用户点进来就是明确要看的;
 * 所以这个表单不主动出现,只挂在"编辑内容/编辑整个文件"这种意图明确的动作后面
 */
export function RawContentForm({ navTitle, initialContent, hint, submitTitle, onSave }: RawContentFormProps) {
  const { pop } = useNavigation();
  const [content, setContent] = useState(initialContent);

  const handleSubmit = async () => {
    try {
      const saved = await onSave(content);
      if (saved === false) {
        // 此前这里照样关闭表单,用户刚敲的一整段内容就没了——这是全应用唯一没有退路的写入路径
        await showToast({
          style: Toast.Style.Failure,
          title: t("raw.notSavedTitle"),
          message: t("raw.notSavedMessage"),
        });
        return;
      }
      pop();
    } catch (e) {
      await showFailureToast(t("common.saveFailedTitle"), e);
    }
  };

  return (
    <Form
      navigationTitle={navTitle}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={submitTitle ?? t("common.save")} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="content" title={t("raw.contentTitle")} value={content} onChange={setContent} />
      <Form.Description text={hint} />
    </Form>
  );
}
