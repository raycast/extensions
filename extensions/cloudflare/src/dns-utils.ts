import type { DnsRecord, DnsRecordCreate } from './service';

export const DNS_RECORD_TYPES = [
  'A',
  'AAAA',
  'CAA',
  'CNAME',
  'MX',
  'NS',
  'SRV',
  'TXT',
] as const;

export type SupportedDnsRecordType = (typeof DNS_RECORD_TYPES)[number];

export function isProxiableRecordType(type: string): boolean {
  return type === 'A' || type === 'AAAA' || type === 'CNAME';
}

export function normalizeDnsRecordName(name: string, zoneName: string): string {
  const trimmed = name.trim().replace(/\.$/, '');
  if (!trimmed || trimmed === '@') return zoneName;
  if (
    trimmed.toLowerCase() === zoneName.toLowerCase() ||
    trimmed.toLowerCase().endsWith(`.${zoneName.toLowerCase()}`)
  ) {
    return trimmed;
  }
  return `${trimmed}.${zoneName}`;
}

export function normalizeDnsRecordContent(
  type: string,
  content: string,
): string {
  const trimmed = content.trim();
  return type === 'TXT'
    ? JSON.stringify(trimmed.replace(/^"|"$/g, ''))
    : trimmed;
}

export function dnsRecordToCreate(
  record: DnsRecord,
  sourceZoneName?: string,
  targetZoneName?: string,
): DnsRecordCreate {
  let name = record.name;
  if (sourceZoneName && targetZoneName) {
    const normalizedName = name.replace(/\.$/, '');
    const normalizedSource = sourceZoneName.replace(/\.$/, '');
    if (normalizedName.toLowerCase() === normalizedSource.toLowerCase()) {
      name = targetZoneName;
    } else if (
      normalizedName
        .toLowerCase()
        .endsWith(`.${normalizedSource.toLowerCase()}`)
    ) {
      name = `${normalizedName.slice(0, -normalizedSource.length)}${targetZoneName}`;
    }
  }

  return {
    type: record.type,
    name,
    content: record.content,
    ttl: record.ttl,
    proxied: record.proxied,
    comment: record.comment,
    tags: record.tags,
    priority: record.priority,
    data: record.data,
    settings: record.settings,
  };
}
