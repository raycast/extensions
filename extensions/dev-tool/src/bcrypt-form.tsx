// src/bcrypt-form.tsx
import { Form, ActionPanel, Action } from "@raycast/api";
import { useState } from "react";
import bcrypt from "bcryptjs";
import { ensureNumberInRange } from "./utils/guard";
import { success, failure } from "./utils/result";

type Mode = "hash" | "verify";

type Values = {
  text: string;
  salt?: string;
  hash?: string;
};

export default function Command() {
  const [mode, setMode] = useState<Mode>("hash");

  async function onSubmit(values: Values) {
    try {
      if (!values.text || !values.text.trim()) {
        throw new Error("请输入明文");
      }

      if (values.mode === "hash") {
        const saltRounds = ensureNumberInRange(Number(values.salt || 12), 4, 31, "Salt 位数");

        const hash = await bcrypt.hash(values.text, saltRounds);

        await success(hash, { title: "加密成功" });
        return;
      }

      if (!values.hash || !values.hash.trim()) {
        throw new Error("请输入待校验的 Hash");
      }

      const ok = await bcrypt.compare(values.text, values.hash);
      if (ok) {
        await success("校验一致", { title: "校验成功", copy: false });
      } else {
        await failure("校验不通过", "校验结果");
      }
    } catch (err) {
      await failure(err, "校验失败");
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="text" title="Text" placeholder="明文" />

      <Form.Dropdown id="mode" title="Mode" value={mode} onChange={(v) => setMode(v as Mode)}>
        <Form.Dropdown.Item value="hash" title="Hash" />
        <Form.Dropdown.Item value="verify" title="Verify" />
      </Form.Dropdown>

      {mode === "hash" && <Form.TextField id="salt" title="Salt Rounds" defaultValue="12" />}

      {mode === "verify" && <Form.TextArea id="hash" title="Hash" placeholder="待校验的 Hash" />}
    </Form>
  );
}
