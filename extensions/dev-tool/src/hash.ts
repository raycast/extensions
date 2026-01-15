// src/hash.ts
import crypto from "crypto";
import { getInputText } from "./utils/input";
import { success, failure } from "./utils/result";

export default async function Command(props: { arguments: { alg?: string; text?: string } }) {
  try {
    const text = await getInputText(props.arguments.text);
    let alg = "sha256";
    if (props.arguments.alg) {
      alg = props.arguments.alg;
    }

    const hash = crypto.createHash(alg).update(text).digest("hex");

    await success(hash, { title: `Hash-${alg} 成功` });
  } catch (err) {
    await failure(err, "Hash 失败");
  }
}
