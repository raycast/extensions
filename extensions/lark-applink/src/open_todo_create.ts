import openLark from "./helper";

// docs: https://open.feishu.cn/document/uAjLw4CM/uYjL24iN/applink-protocol/supported-protocol/open-todo/create-task
export default async function () {
  await openLark("/client/todo/create");
}
