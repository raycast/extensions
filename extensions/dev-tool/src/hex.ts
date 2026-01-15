// src/hex.ts
import { getInputText } from "./utils/input";
import { ensureHex } from "./utils/guard";
import { success, failure } from "./utils/result";

export default async function Command(props: { arguments: { op?: string; text?: string } }) {
  try {
    const text = await getInputText(props.arguments.text);
    let op = "decode";
    if (props.arguments.op) {
      op = props.arguments.op;
    }

    const result =
      op === "decode"
        ? Buffer.from(text, "utf8").toString("hex")
        : Buffer.from(ensureHex(text), "hex").toString("utf8");

    await success(result, { title: `Hex ${op === "decode" ? "Decode" : "Encode"} 成功` });
  } catch (err) {
    await failure(err, "Hex 失败");
  }
}
