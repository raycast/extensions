const OTP_PATTERN = /(?<![\d\p{L}])\d{4,8}(?![\d\p{L}])/gu;

export function extractOtp(text: string): string | undefined {
  if (!text) return undefined;
  const candidates = text.match(OTP_PATTERN) ?? [];
  const unique = [...new Set(candidates)];
  return unique.length === 1 ? unique[0] : undefined;
}

export function isValidOtp(value: string | undefined): value is string {
  return value !== undefined && /^\d{4,8}$/.test(value);
}
