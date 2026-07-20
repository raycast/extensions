export type ExtractedCode = {
  value: string;
  kind: "code" | "link";
  label: string;
};

const CODE_PATTERNS = [
  /(?:验证码|校验码|动态码|认证码|安全码|verification code|security code|code)[^\d]{0,16}(\d{4,8})/i,
  /(\d{4,8})[^\d]{0,12}(?:验证码|校验码|动态码|认证码|安全码|verification code|security code|code)/i,
];

const LINK_PATTERNS = [/https?:\/\/[^\s"'<>]*(?:login|verify|verification|auth|confirm|activate|token)[^\s"'<>]*/i];

export function extractCodesAndLinks(text: string): ExtractedCode[] {
  const results: ExtractedCode[] = [];

  for (const pattern of CODE_PATTERNS) {
    for (const match of text.matchAll(new RegExp(pattern, "gi"))) {
      const code = match[1];
      if (code && !results.some((item) => item.value === code)) {
        results.push({
          value: code,
          kind: "code",
          label: `${code.length}-digit code`,
        });
      }
    }
  }

  for (const pattern of LINK_PATTERNS) {
    for (const match of text.matchAll(new RegExp(pattern, "gi"))) {
      const link = sanitizeLink(match[0]);
      if (link && !results.some((item) => item.value === link)) {
        results.push({
          value: link,
          kind: "link",
          label: "Login or verification link",
        });
      }
    }
  }

  return results;
}

export function extractBestCodeOrLink(text: string): ExtractedCode | undefined {
  const results = extractCodesAndLinks(text);
  return results.find((item) => item.kind === "code") || results.find((item) => item.kind === "link");
}

function sanitizeLink(value: string): string {
  return value.replace(/[),.;，。；）]+$/g, "");
}
