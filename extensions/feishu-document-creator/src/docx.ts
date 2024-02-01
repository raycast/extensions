import openFeishuURL from "./helper";

export default async function () {
  await openFeishuURL("/drive/create/?type=docx");
}
