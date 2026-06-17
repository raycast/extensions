import openLark from "./helper";

// docs: https://open.feishu.cn/document/uAjLw4CM/uYjL24iN/applink-protocol/supported-protocol/open-todo/open-the-task-tab-page
export default async function () {
  await openLark("/client/todo/view?tab=assign_from_me");
}
