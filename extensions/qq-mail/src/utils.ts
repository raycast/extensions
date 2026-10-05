/* eslint-disable @typescript-eslint/no-explicit-any */
import { Email, EmailAddress, EmailBody } from "./types";

export function checkIsArchive(obj: any) {
  return obj.specialUse === "\\Archive" || obj.path.toLowerCase() === "archive" || obj.name.toLowerCase() === "archive";
}

export function formatAddressDisplay(addresses: EmailAddress[] | undefined): string {
  if (!addresses || addresses.length === 0) return "";
  return addresses.map((a) => (a.name ? `${a.name} <${a.address}>` : a.address)).join(", ");
}

interface BodyStructure {
  disposition?: string;
  childNodes?: unknown[];
}
export function checkHasAttachment(bodyStructure?: BodyStructure): boolean {
  if (!bodyStructure) return false;

  if (bodyStructure.disposition === "attachment") {
    return true;
  }

  if (bodyStructure.childNodes) {
    for (const child of bodyStructure.childNodes) {
      if (checkHasAttachment(child as { disposition?: string; childNodes?: unknown[] })) {
        return true;
      }
    }
  }

  return false;
}

export function extractPreview(source: Buffer | undefined): string {
  if (!source) return "";

  const text = source.toString("utf-8");
  // Try to extract text after headers (double newline)
  const parts = text.split(/\r?\n\r?\n/);
  if (parts.length > 1) {
    const body = parts.slice(1).join(" ");
    // Clean up and truncate
    return body
      .replace(/<[^>]*>/g, "") // Remove HTML tags
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim()
      .substring(0, 200);
  }
  return "";
}

export function parseAddresses(addresses: { name?: string; address?: string }[] | undefined): EmailAddress[] {
  if (!addresses) return [];
  return addresses
    .filter((addr) => addr.address)
    .map((addr) => ({
      name: addr.name,
      address: addr.address!,
    }));
}

export function buildEmailFromMessage(folderPath: string, message: any): Email {
  const envelope = message.envelope;
  return {
    mailboxPath: folderPath,
    uid: message.uid,
    messageId: envelope?.messageId || "",
    subject: envelope?.subject || "(No Subject)",
    from: parseAddresses(envelope?.from as { name?: string; address?: string }[]),
    to: parseAddresses(envelope?.to as { name?: string; address?: string }[]),
    cc: parseAddresses(envelope?.cc as { name?: string; address?: string }[]),
    date: envelope?.date || new Date(),
    flags: message.flags instanceof Set ? [...message.flags] : Array.isArray(message.flags) ? message.flags : [],
    hasAttachment: checkHasAttachment(message.bodyStructure),
    preview: extractPreview(message.source),
  };
}

export function formatDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function hasFlag(flags: string[] | unknown, flag: string): boolean {
  if (Array.isArray(flags)) return flags.includes(flag);
  return false;
}

export function cleanHtml(html?: string, includeImages: boolean = true): string {
  if (!html) return "";

  let text = html;

  // Remove style, script, and head tags with their content
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "");

  // Remove VML/XML behavior declarations (Microsoft Outlook)
  text = text.replace(/v:\*\s*\{[^}]*\}/gi, "");
  text = text.replace(/o:\*\s*\{[^}]*\}/gi, "");
  text = text.replace(/w:\*\s*\{[^}]*\}/gi, "");
  text = text.replace(/\.shape\s*\{[^}]*\}/gi, "");
  text = text.replace(/\{behavior:url\([^)]*\)[^}]*\}/gi, "");

  // Remove CSS-like declarations that leaked through
  text = text.replace(/[a-z]+:\*\s*\{[^}]*\}/gi, "");

  // Convert common HTML entities
  text = text.replace(/&nbsp;/gi, " ");
  text = text.replace(/&amp;/gi, "&");
  text = text.replace(/&lt;/gi, "<");
  text = text.replace(/&gt;/gi, ">");
  text = text.replace(/&quot;/gi, '"');
  text = text.replace(/&#(\d+);/gi, (_, num) => String.fromCharCode(parseInt(num, 10)));

  // Convert line breaks
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/p>/gi, "\n\n");
  text = text.replace(/<\/div>/gi, "\n");
  text = text.replace(/<\/li>/gi, "\n");
  text = text.replace(/<\/tr>/gi, "\n");

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, "");

  // Clean up whitespace
  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/\n[ \t]+/g, "\n");
  text = text.replace(/[ \t]+\n/g, "\n");
  text = text.replace(/\n{3,}/g, "\n\n");

  // Convert standalone URLs in brackets to markdown format
  if (includeImages) {
    // Image URLs (png, jpg, jpeg, gif, webp, svg) -> ![](url)
    text = text.replace(/\[(https?:\/\/[^\]]+\.(png|jpg|jpeg|gif|webp|svg)(?:\?[^\]]*)?)\]/gi, "![]($1)");
  } else {
    // Strip image URLs entirely for compact view
    text = text.replace(/\[(https?:\/\/[^\]]+\.(png|jpg|jpeg|gif|webp|svg)(?:\?[^\]]*)?)\]/gi, "");
  }
  // Other URLs -> [link](url)
  text = text.replace(/\[(https?:\/\/[^\]]+)\]/gi, (match, url) => {
    // Skip if already converted to image
    if (match.startsWith("![")) return match;
    return `[link](${url})`;
  });

  // If not including images, also remove any markdown image syntax that might exist
  if (!includeImages) {
    text = text.replace(/!\[[^\]]*\]\([^)]+\)/g, "");

    // Remove common "view in browser" / "click here" boilerplate text
    text = text.replace(/click here to view this message in a browser[^\n]*/gi, "");
    text = text.replace(/view this (email|message) in (your |a )?browser[^\n]*/gi, "");
    text = text.replace(/having trouble viewing this[^\n]*/gi, "");
    text = text.replace(/can't see this (email|message)[^\n]*/gi, "");
    text = text.replace(/not displaying correctly[^\n]*/gi, "");
    text = text.replace(/view (this )?(email |message )?online[^\n]*/gi, "");
    text = text.replace(/view in browser[^\n]*/gi, "");
    text = text.replace(/open in browser[^\n]*/gi, "");

    // Convert standalone long URLs to markdown links for compact display
    // This preserves the link while keeping the preview clean
    text = text.replace(/(?<!\()(?<!\[)(https?:\/\/[^\s\n]{50,})(?!\))/g, (url) => `[link](${url})`);

    // For compact view, collapse 3+ newlines to 2 for tighter display
    text = text.replace(/\n{3,}/g, "\n\n");
  } else {
    // For expanded view, allow max 2 consecutive newlines
    text = text.replace(/\n{3,}/g, "\n\n");
  }

  return text.trim();
}

/**
 * 从解析后的邮件对象中提取验证码
 */
export function extractCode(email: EmailBody & { subject?: string }): string {
  // 1. 优先尝试从纯文本中提取（如果存在且内容丰富）
  if (email.text) {
    const code = findCodeInText(email.text);
    if (code) return code;
  }

  // 2. 如果纯文本不行，从 HTML 中提取
  if (email.html) {
    const code = findCodeInHtml(email.html);
    if (code) return code;
  }

  if (email.subject) {
    const code = findCodeInText(email.subject);
    if (code) return code;
  }

  return "";
}

/**
 * 从 HTML 字符串中提取验证码
 */
function findCodeInHtml(html: string): string | null {
  // 策略 A: 针对常见验证码邮件结构的通用正则
  // 匹配类似: <span...>123456</span> 或 <b...>123456</b>
  // 重点查找包含 "code", "验证码", "verification" 附近的数字

  // 1. 先尝试查找带有特定类名或结构的标签（针对你提供的 Readify 例子）
  // 匹配 class 包含 "code" 的标签内的数字
  const classBasedRegex = /class=["'][^"']*code[^"']*["'][^>]*>\s*(\d{4,8})\s*</i;
  const matchClass = html.match(classBasedRegex);
  if (matchClass && matchClass[1]) {
    return matchClass[1];
  }

  // 2. 通用上下文匹配：在 HTML 中查找 "验证码" 或 "code" 附近的数字
  // 注意：HTML 中可能有标签穿插，所以要用 [\s\S]*? 允许标签存在
  const contextRegex = /(?:验证码|verification\s*code|your\s*code|auth\s*code)[\s\S]*?(\b\d{4,8}\b)/i;
  const matchContext = html.match(contextRegex);
  if (matchContext && matchContext[1]) {
    return matchContext[1];
  }

  // 3.  fallback: 查找所有孤立的大号数字块（通常验证码会用特殊样式包裹）
  // 匹配被标签包裹的 4-8 位数字，且周围没有太多其他数字
  const isolatedNumberRegex = />[^\d]*(\d{4,8})[^\d]*</g;
  let match;
  const candidates = [];
  while ((match = isolatedNumberRegex.exec(html)) !== null) {
    // 简单过滤：排除看起来像年份、日期、ID 的数字
    // 这里假设验证码通常是独立的
    candidates.push(match[1]);
  }

  // 如果有候选项，返回第一个（通常最新的或最显眼的在前面）
  if (candidates.length > 0) {
    return candidates[0];
  }

  return null;
}

/**
 * 从纯文本中提取验证码（备用）
 */
function findCodeInText(text: string): string | null {
  const contextRegex = /(?:验证码|code|verification)[\s:：]*?(\b\d{4,8}\b)/i;
  const match = text.match(contextRegex);
  return match ? match[1] : null;
}
