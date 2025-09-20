import openLark from "./helper";

// docs: https://open.feishu.cn/document/uAjLw4CM/uYjL24iN/applink-protocol/supported-protocol/open-calender/open
export default async function () {
  await openLark("/client/calendar/account");
}
