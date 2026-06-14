import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Detail,
} from "@raycast/api";
import { useState } from "react";

interface JWTResult {
  header: string;
  payload: string;
  parsedPayload: Record<string, unknown>;
}

interface TokenStatus {
  isExpired: boolean | null;
  expiresAt: string | null;
  issuedAt: string | null;
  notBefore: string | null;
  timeUntilExpiry: string | null;
}

export default function Command() {
  const [jwtInput, setJwtInput] = useState("");
  const [result, setResult] = useState<JWTResult | null>(null);
  const [tokenStatus, setTokenStatus] = useState<TokenStatus | null>(null);
  const [isShowingResult, setIsShowingResult] = useState(false);

  function decodeBase64Url(str: string): string {
    let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
      base64 += "=";
    }
    return Buffer.from(base64, "base64").toString("utf8");
  }

  function formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "short",
    });
  }

  function getTimeUntilExpiry(expTimestamp: number): string {
    const now = Math.floor(Date.now() / 1000);
    const diff = expTimestamp - now;

    if (diff <= 0) {
      const absDiff = Math.abs(diff);
      if (absDiff < 60) return `Expired ${absDiff} seconds ago`;
      if (absDiff < 3600)
        return `Expired ${Math.floor(absDiff / 60)} minutes ago`;
      if (absDiff < 86400)
        return `Expired ${Math.floor(absDiff / 3600)} hours ago`;
      return `Expired ${Math.floor(absDiff / 86400)} days ago`;
    }

    if (diff < 60) return `Expires in ${diff} seconds`;
    if (diff < 3600) return `Expires in ${Math.floor(diff / 60)} minutes`;
    if (diff < 86400) return `Expires in ${Math.floor(diff / 3600)} hours`;
    return `Expires in ${Math.floor(diff / 86400)} days`;
  }

  function analyzeTokenStatus(payload: Record<string, unknown>): TokenStatus {
    const now = Math.floor(Date.now() / 1000);
    const status: TokenStatus = {
      isExpired: null,
      expiresAt: null,
      issuedAt: null,
      notBefore: null,
      timeUntilExpiry: null,
    };

    if (typeof payload.exp === "number") {
      status.isExpired = now > payload.exp;
      status.expiresAt = formatTimestamp(payload.exp);
      status.timeUntilExpiry = getTimeUntilExpiry(payload.exp);
    }

    if (typeof payload.iat === "number") {
      status.issuedAt = formatTimestamp(payload.iat);
    }

    if (typeof payload.nbf === "number") {
      status.notBefore = formatTimestamp(payload.nbf);
    }

    return status;
  }

  function handleDecode(values: { jwt: string }) {
    const token = values.jwt.trim();
    if (!token) {
      showToast({ style: Toast.Style.Failure, title: "Input is empty" });
      return;
    }

    const parts = token.split(".");
    if (parts.length !== 3) {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid JWT Format",
        message:
          "A valid JWT must contain exactly 3 segments separated by dots.",
      });
      return;
    }

    try {
      const parsedHeader = JSON.parse(decodeBase64Url(parts[0])) as Record<
        string,
        unknown
      >;
      const parsedPayload = JSON.parse(decodeBase64Url(parts[1])) as Record<
        string,
        unknown
      >;

      const decodedHeader = JSON.stringify(parsedHeader, null, 2);
      const decodedPayload = JSON.stringify(parsedPayload, null, 2);

      const status = analyzeTokenStatus(parsedPayload);

      setResult({
        header: decodedHeader,
        payload: decodedPayload,
        parsedPayload,
      });
      setTokenStatus(status);
      setIsShowingResult(true);

      if (status.isExpired === true) {
        showToast({ style: Toast.Style.Failure, title: "⚠️ Token is Expired" });
      } else if (status.isExpired === false) {
        showToast({ style: Toast.Style.Success, title: "✓ Token is Valid" });
      } else {
        showToast({
          style: Toast.Style.Success,
          title: "JWT Decoded Successfully",
        });
      }
    } catch {
      showToast({
        style: Toast.Style.Failure,
        title: "Decoding Failed",
        message: "The token contains invalid JSON structures.",
      });
    }
  }

  if (isShowingResult && result && tokenStatus) {
    const statusBadge =
      tokenStatus.isExpired === true
        ? "## 🔴 EXPIRED"
        : tokenStatus.isExpired === false
          ? "## 🟢 VALID"
          : "## ⚪ NO EXPIRY";

    const timeInfo = tokenStatus.timeUntilExpiry
      ? `\n> ${tokenStatus.timeUntilExpiry}`
      : "";

    const timestampRows: string[] = [];
    if (tokenStatus.issuedAt) {
      timestampRows.push(`| **Issued At** (iat) | ${tokenStatus.issuedAt} |`);
    }
    if (tokenStatus.expiresAt) {
      timestampRows.push(`| **Expires At** (exp) | ${tokenStatus.expiresAt} |`);
    }
    if (tokenStatus.notBefore) {
      timestampRows.push(`| **Not Before** (nbf) | ${tokenStatus.notBefore} |`);
    }

    const claimsSection =
      timestampRows.length > 0
        ? `
### ⏱️ Token Timestamps
| Claim | Value |
|-------|-------|
${timestampRows.join("\n")}
`
        : "";

    const markdownOutput = `
${statusBadge}
${timeInfo}

---
${claimsSection}
### 🔑 Header
\`\`\`json
${result.header}
\`\`\`

### 📦 Payload
\`\`\`json
${result.payload}
\`\`\`

---
*⌘⇧P — Copy Payload • ⌘⇧H — Copy Header*
`;

    return (
      <Detail
        markdown={markdownOutput}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard
              title="Copy Payload JSON"
              content={result.payload}
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            />
            <Action.CopyToClipboard
              title="Copy Header JSON"
              content={result.header}
              shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
            />
            <Action.CopyToClipboard
              title="Copy Full Token"
              content={jwtInput.trim()}
            />
            <Action
              title="Decode Another Token"
              onAction={() => {
                setIsShowingResult(false);
                setJwtInput("");
                setResult(null);
                setTokenStatus(null);
              }}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Decode Token" onSubmit={handleDecode} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="jwt"
        title="Raw JWT Token"
        placeholder="Paste your encoded eyJ... token here"
        value={jwtInput}
        onChange={setJwtInput}
      />
      <Form.Description text="The token will be decoded locally. Your data never leaves this device." />
    </Form>
  );
}
