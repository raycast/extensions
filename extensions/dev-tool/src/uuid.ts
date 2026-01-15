import crypto from "crypto";
import { success, failure } from "./utils/result";

export default async function Command(props: { arguments: { dash?: string; upper?: string } }) {
  try {
    const { dash, upper } = props.arguments;

    // 只有在用户选了的时候才转换为 bool
    const keepDash = dash !== undefined ? dash === "true" : true;
    // const keepDash = dash ?? false;
    const toUpper = upper !== undefined ? upper === "true" : false;
    // const toUpper = upper ?? false;

    let uuid = crypto.randomUUID();

    if (keepDash) {
      uuid = uuid.replace(/-/g, "");
    }
    if (toUpper) {
      uuid = uuid.toUpperCase();
    }

    await success(uuid, { title: "UUID 生成成功" });
  } catch (error) {
    await failure(error, "生成 UUID 失败");
  }
}
