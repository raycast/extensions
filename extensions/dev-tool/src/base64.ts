// src/base64.ts
import { getInputText } from "./utils/input";
import { ensureBase64 } from "./utils/guard";
import { success, failure } from "./utils/result";

export default async function Command(props: { arguments: { op?: string; text?: string } }) {
  try {
    const text = await getInputText(props.arguments.text);
    let op = "decode";
    if (props.arguments.op) {
      op = props.arguments.op;
    }

    const result =
      op === "encode"
        ? Buffer.from(text, "utf8").toString("base64")
        : Buffer.from(ensureBase64(text), "base64").toString("utf8");

    await success(result, { title: `Base64 ${op === "decode" ? "Decode" : "Encode"} 成功` });
  } catch (err) {
    await failure(err, "Base64 失败");
  }
}
