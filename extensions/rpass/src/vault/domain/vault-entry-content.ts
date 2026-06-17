export interface VaultEntryRow {
  idx: number;
  name: string;
  value: string;
}

const TOTP_PATTERN = /^otpauth:\/\/(totp|hotp)\/([^?]+)\?(.+)$/;

export function parseVaultEntryRows(content: string): VaultEntryRow[] {
  return content
    .split("\n")
    .filter(Boolean)
    .map((line, idx) => {
      if (TOTP_PATTERN.test(line)) return { idx, name: "otpauth", value: line };
      if (idx === 0) return { idx, name: "pass", value: line };
      const [name, value] = line.split(/:\s?(.*)/, 2);
      if (value === undefined) return { idx, name: "note", value: line };
      return { idx, name, value };
    });
}
