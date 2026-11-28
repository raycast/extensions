import { useEffect, useState } from "react";
import { readFileSync } from "node:fs";
import { List, Action, ActionPanel, Icon, Keyboard, Toast, showToast, Clipboard, Form, useNavigation, showHUD } from "@raycast/api";
import { decodeJwt, verifyHs256, verifyAsymmetric, jwtStatus, JWT_TIME_CLAIMS, detectJwt, type JwtStatusLevel } from "./lib/pure";
import { parseHashInput, fmtLocal, fmtRelative, formatJson } from "./lib/pure";
import { usePrefill } from "./lib/prefill";

const STATUS_ICON: Record<JwtStatusLevel, string> = {
  expired: "❌",
  "not-yet-valid": "⏸",
  valid: "✅",
  unknown: "❓",
};


/** Verify Form（方案 E）：密钥专属输入（PEM/JWK/文件路径三格式识别），剪贴板白名单预填 */
function VerifyForm({ token, onResult }: { token: string; onResult: (r: string) => void }) {
  const { pop } = useNavigation();
  const jwt = decodeJwt(token);
  const alg = typeof jwt?.header.alg === "string" ? jwt.header.alg : "Unknown";
  const [keyMaterial, setKeyMaterial] = useState<string>("");
  const [clipboardLoaded, setClipboardLoaded] = useState(false);

  // 剪贴板预填：仅密钥形态前缀（BEGIN/{/~/）——普通文本（含 token 本身）不预填
  useEffect(() => {
    if (clipboardLoaded) return;
    setClipboardLoaded(true);
    (async () => {
      try {
        const clip = (await Clipboard.read()).text?.trim() ?? "";
        if (clip.startsWith("-----BEGIN") || clip.startsWith("{") || clip.startsWith("~") || clip.startsWith("/")) {
          setKeyMaterial(clip);
        }
      } catch {
        /* 剪贴板不可读：忽略 */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verify = () => {
    const raw = keyMaterial.trim();
    if (!raw) return;
    let result: string;
    if (alg === "none") result = "Unsigned · verification skipped";
    else if (alg === "HS256") result = verifyHs256(token, raw) ? "✅ Signature valid" : "❌ Signature mismatch";
    else {
      const r = verifyAsymmetric(token, raw, (path) => readFileSync(path.replace(/^~/, process.env.HOME ?? "~"), "utf8"));
      result = r.ok ? "✅ Signature valid" : r.error === "mismatch" ? `⚠ Key type mismatch (${alg} needs an ${alg === "RS256" ? "RSA" : "EC"} key)` : "⚠ Unparseable public key";
    }
    onResult(result);
    pop();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Verify" onSubmit={verify} />
        </ActionPanel>
      }
    >
      <Form.Description title="Token" text={`${token.slice(0, 20)}… · alg: ${alg} · ${token.length} chars`} />
      <Form.TextArea
        id="key"
        title="Public key / secret"
        placeholder='Paste PEM / JWK or a file path (~/ or /); short HS256 secrets can also go inline as "token || key"'
        value={keyMaterial}
        onChange={setKeyMaterial}
        enableMarkdown={false}
      />
    </Form>
  );
}

export default function Command() {
  const prefill = usePrefill(detectJwt);
  const [query, setQuery] = useState("");
  const [edited, setEdited] = useState(false); // 用户输入过即锁存：预填永久失效（含清空后）

  // 预填注入：一次性写入 query state（timestamp 同款）；edited 后不再注入
  useEffect(() => {
    if (prefill && !edited && !query) setQuery(prefill);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill]);



  const [formResult, setFormResult] = useState<string | null>(null); // Verify Form 回传结果

  const effectiveQuery = query;
  const { text, key } = parseHashInput(effectiveQuery);
  const jwt = text ? decodeJwt(text) : null;

  // token 变化时清除 Form Verify结果（旧结果对应旧 token）
  useEffect(() => {
    setFormResult(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  // 状态行组装：时间态 + Verify结果（存在时拼接）
  let statusText = "—";
  let verifyText = "";
  if (jwt) {
    const st = jwtStatus(jwt.payload);
    statusText = `${STATUS_ICON[st.level]} ${st.label}`;
    const alg = typeof jwt.header.alg === "string" ? jwt.header.alg : "";
    if (formResult) verifyText = formResult; // Form Verify结果优先展示（token 变化时清除）
    else if (key) {
      // alg 先分流（design 决策 1）：HS256 密钥原文直接 HMAC；RS/ES256 过 resolveKeyMaterial
      if (alg === "none") verifyText = "Unsigned · verification skipped";
      else if (alg === "HS256") verifyText = verifyHs256(text, key) ? "✅ Signature valid" : "❌ Signature mismatch";
      else if (alg === "RS256" || alg === "ES256") {
        const r = verifyAsymmetric(text, key, (path) => readFileSync(path.replace(/^~/, process.env.HOME ?? "~"), "utf8"));
        verifyText = r.ok
          ? "✅ Signature valid"
          : r.error === "mismatch"
            ? `⚠ Key type mismatch (${alg} needs an ${alg === "RS256" ? "RSA" : "EC"} key)`
            : "⚠ Unparseable public key";
      }
    }
  }

  const claims = jwt
    ? Object.entries(jwt.payload).map(([k, v]) => {
        const valueStr = typeof v === "object" && v !== null ? formatJson(JSON.stringify(v), 0, false).text : String(v);
        let subtitle = k;
        if ((JWT_TIME_CLAIMS as readonly string[]).includes(k) && typeof v === "number") {
          const d = new Date(v * 1000);
          subtitle = `${k} · ${v} · ${fmtLocal(d)} · ${fmtRelative(d)}(relative to now)`;
        }
        return { key: k, value: valueStr, subtitle };
      })
    : [];

  return (
    <List
      searchText={effectiveQuery}
      onSearchTextChange={(t) => {
        setEdited(true);
        setQuery(t);
      }}

      filtering={false}
      searchBarPlaceholder='Paste a JWT (optionally "JWT || key" for HS256)'
      isShowingDetail={false}
    >
      {!text ? (
        <List.EmptyView
          title="Paste a JWT to decode"
          description="Paste a three-segment token; ⌘V or action panel to verify (HS256 / RS256 / ES256)"
          icon={Icon.Lock}
        />
      ) : !jwt ? (
        <List.Item
          icon={Icon.ExclamationMark}
          title="Not a valid JWT"
          subtitle="Expected three segments xxx.yyy.zzz (Base64URL-encoded header.payload.signature)"
        />
      ) : (
        <>
          <List.Item
            icon={Icon.Lock}
            title={`${typeof jwt.header.alg === "string" ? jwt.header.alg : "Unknown algorithm"}${
              jwt.header.alg === "none" ? " · unsigned" : ""
            }`}
            subtitle={`Header${typeof jwt.header.typ === "string" ? ` · ${jwt.header.typ}` : ""}`}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Verify Signature…"
                  icon={Icon.Key}
                  shortcut={Keyboard.Shortcut.Common.Refresh ?? { modifiers: ["cmd"], key: "v" }}
                  target={<VerifyForm token={text} onResult={setFormResult} />}
                />
              </ActionPanel>
            }
          />
          <List.Item icon={Icon.Clock} title={verifyText ? `${statusText} · ${verifyText}` : statusText} subtitle="Status (local clock)" />
          {claims.map((c) => (
            <List.Item
              key={c.key}
              id={c.key}
              icon={Icon.Tag}
              title={c.value}
              subtitle={c.subtitle}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy Value"
                    content={c.value}
                    onCopy={async () => {
                      await showToast(Toast.Style.Success, "Copied", `${c.key} = ${c.value}`);
                    }}
                  />
                  <Action
                    title="Paste to Frontmost App"
                    icon={Icon.Clipboard}
                    shortcut={Keyboard.Shortcut.Common.Edit}
                    onAction={async () => {
                      await Clipboard.paste(c.value);
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </>
      )}
    </List>
  );
}
