// src/jwt-form.tsx
import { ActionPanel, Action, Detail, Form } from "@raycast/api";
import { useState } from "react";
import crypto from "crypto";
import { success, failure } from "./utils/result";

type Mode = "parse" | "generate";

function decodePart(part: string) {
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
}

function formatJwtTimeInline(ts: number) {
  if (!ts) return;

  const time = ts;
  if (time.toString().length <= 10) {
    ts = ts * 1000;
  }
  const date = new Date(ts);

  const pad = (n: number) => n.toString().padStart(2, "0");

  const formatted =
    `${date.getFullYear()}-` +
    `${pad(date.getMonth() + 1)}-` +
    `${pad(date.getDate())} ` +
    `${pad(date.getHours())}:` +
    `${pad(date.getMinutes())}:` +
    `${pad(date.getSeconds())}`;

  const now = Date.now();
  const status = date.getTime() < now ? "expired" : "active";

  return `// ${formatted} · ${status}`;
}

// function formatJwtTimeInline(ts: number) {
//   const date = new Date(ts * 1000);
//   const now = Date.now();

//   let status = "active";
//   if (date.getTime() < now) status = "expired";
//   if (date.getTime() > now) status = "not yet valid";

//   return `//(${date.toISOString()} · ${status})`;
// }

function renderPayload(payload: Record<string, unknown>) {
  const lines: string[] = ["{"];

  const keys = Object.keys(payload);
  keys.forEach((key, idx) => {
    const value = payload[key];
    let line = `  "${key}": ${JSON.stringify(value)}`;

    if (typeof value === "number" && ["exp", "iat", "nbf"].includes(key)) {
      line += ` ${formatJwtTimeInline(value)}`;
    }

    if (idx < keys.length - 1) {
      line += ",";
    }

    lines.push(line);
  });

  lines.push("}");
  return lines.join("\n");
}

function signHS256(header: unknown, payload: unknown, secret: string) {
  const b64 = (v: unknown) => Buffer.from(JSON.stringify(v)).toString("base64url");

  const data = `${b64(header)}.${b64(payload)}`;
  const sig = crypto.createHmac("sha256", secret).update(data).digest("base64url");

  return `${data}.${sig}`;
}

export default function Command() {
  const [mode, setMode] = useState<Mode>("parse");
  const [detail, setDetail] = useState<string | null>(null);

  if (detail) {
    return (
      <Detail
        markdown={detail}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content={detail} />
          </ActionPanel>
        }
      />
    );
  }

  async function onSubmit(values: unknown) {
    try {
      if (mode === "parse") {
        const parts = values.token.split(".");
        if (parts.length !== 3) {
          throw new Error("非法 JWT");
        }

        const header = decodePart(parts[0]);
        const payload = decodePart(parts[1]);
        const payloadStr = renderPayload(payload);

        // const exp = formatJwtTimeInline(payload.exp);
        // const iat = formatJwtTimeInline(payload.iat);
        // const nbf = formatJwtTimeInline(payload.nbf);

        const markdown = `
## Header
\`\`\`json
${JSON.stringify(header, null, 2)}
\`\`\`

## Payload
\`\`\`json
${payloadStr}
\`\`\`

## Signature
\`\`\`
${parts[2]}
\`\`\`
`;
        setDetail(markdown);
        return;
      }

      // generate
      const payload = JSON.parse(values.payload);
      const secret = values.secret;

      const header = { alg: "HS256", typ: "JWT" };
      const token = signHS256(header, payload, secret);

      setDetail(`## JWT Generated\n\`\`\`\n${token}\n\`\`\``);

      await success(token, { title: "JWT Generated 成功并已复制到剪贴板" });
    } catch (err: unknown) {
      await failure(err, `JWT${mode === "parse" ? "解析" : "生成"}失败`);
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
      <Form.Dropdown id="mode" title="Mode" value={mode} onChange={(v) => setMode(v as Mode)}>
        <Form.Dropdown.Item value="parse" title="Parse" />
        <Form.Dropdown.Item value="generate" title="Generate (HS256)" />
      </Form.Dropdown>

      {mode === "parse" && <Form.TextArea id="token" title="JWT Token" placeholder="Header.Payload.Signature" />}

      {mode === "generate" && (
        <>
          <Form.TextArea id="payload" title="Payload (JSON)" placeholder='{"sub":"123","exp":1710000000}' />
          <Form.TextField id="secret" title="Secret" placeholder="HS256 secret" />
        </>
      )}
    </Form>
  );
}
