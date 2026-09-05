import { showHUD } from "@raycast/api";
import { sendContentToChatGPT, showSendError } from "./ask-selected-text";

interface Arguments {
  question: string;
}

export default async function Command(props: { arguments: Arguments }) {
  try {
    const question = props.arguments.question.trim();
    if (!question) {
      await showHUD("请输入你想问 GPT 的问题");
      return;
    }

    await sendContentToChatGPT(question);
  } catch (error) {
    await showSendError(error, "无法发送问题");
  }
}
