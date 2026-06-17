import openLark from "./helper";

// docs: https://open.feishu.cn/document/uAjLw4CM/uYjL24iN/applink-protocol/supported-protocol/open-a-chat-page
export default async function () {
  await openLark("/client/chat/open");
}
