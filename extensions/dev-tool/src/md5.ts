// src/md5.ts
import crypto from "crypto";
import { getInputText } from "./utils/input";
import { success, failure } from "./utils/result";

export default async function Command(props: { arguments: { text?: string } }) {
  try {
    const text = await getInputText(props.arguments.text);
    const hash = crypto.createHash("md5").update(text).digest("hex");

    await success(hash, { title: "MD5 生成成功" });
  } catch (err) {
    await failure(err, "MD5 失败");
  }
}
