// src/utils/guard.ts

export function ensureNonEmpty(value: string, fieldName = "参数"): string {
  if (!value || value.trim().length === 0) {
    throw new Error(`${fieldName}不能为空`);
  }
  return value;
}

export function ensureOneOf<T extends string>(value: string, allowed: readonly T[], fieldName = "参数"): T {
  if (!allowed.includes(value as T)) {
    throw new Error(`${fieldName} 必须是 ${allowed.join(" / ")}`);
  }
  return value as T;
}

export function ensureNumberInRange(value: number, min: number, max: number, fieldName = "参数"): number {
  if (Number.isNaN(value)) {
    throw new Error(`${fieldName} 必须是数字`);
  }
  if (value < min || value > max) {
    throw new Error(`${fieldName} 必须在 ${min} ~ ${max} 之间`);
  }
  return value;
}

export function ensureBoolean(value: unknown, defaultValue = false): boolean {
  if (value === undefined) return defaultValue;
  return Boolean(value);
}

// guard.ts
export function ensureBase64(text: string): string {
  const trimmed = text.trim();

  if (trimmed.length % 4 !== 0) {
    throw new Error("非法 Base64：长度不是 4 的倍数");
  }

  const base64Regex = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

  if (!base64Regex.test(trimmed)) {
    throw new Error("非法 Base64 格式");
  }

  return trimmed;
}

export function ensureHex(text: string): string {
  const trimmed = text.trim();

  if (trimmed.length % 2 !== 0) {
    throw new Error("非法 Hex：长度必须是偶数");
  }

  if (!/^[0-9a-fA-F]+$/.test(trimmed)) {
    throw new Error("非法 Hex：只能包含 0-9 a-f A-F");
  }

  return trimmed;
}

export function ensureHashHex(text: string, lengths: number[], fieldName = "Hash"): string {
  const trimmed = text.trim();

  if (!/^[0-9a-fA-F]+$/.test(trimmed)) {
    throw new Error(`${fieldName} 必须是十六进制字符串`);
  }

  if (!lengths.includes(trimmed.length)) {
    throw new Error(`${fieldName} 长度必须是 ${lengths.join(" / ")}`);
  }

  return trimmed;
}
