export interface VaultEntryRow {
  idx: number;
  name: string;
  value: string;
}

const TOTP_PATTERN = /^otpauth:\/\/(totp|hotp)\/([^?]+)\?(.+)$/;

export function parseVaultEntryRows(content: string): VaultEntryRow[] {
  const lines = content.split("\n");
  const rows: VaultEntryRow[] = [];

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    if (line === "") continue;

    if (TOTP_PATTERN.test(line)) {
      rows.push({ idx, name: "otpauth", value: line });
      continue;
    }

    if (idx === 0) {
      rows.push({ idx, name: "pass", value: line });
      continue;
    }

    const [name, value] = line.split(/:\s?(.*)/, 2);
    if (value === undefined) {
      rows.push({ idx, name: "note", value: line });
    } else {
      rows.push({ idx, name, value });
    }
  }

  return rows;
}
