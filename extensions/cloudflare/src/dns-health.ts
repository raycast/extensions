import type { DnsRecord, Dnssec } from './service';

export type DnsHealthSeverity = 'critical' | 'warning' | 'info';

export interface DnsHealthFinding {
  id: string;
  severity: DnsHealthSeverity;
  title: string;
  description: string;
  recordIds?: string[];
}

export interface DnsHealthReport {
  score: number;
  findings: DnsHealthFinding[];
}

function normalizedContent(record: DnsRecord): string {
  return record.content.trim().replace(/^"|"$/g, '');
}

export function analyzeDnsHealth(
  zoneName: string,
  records: DnsRecord[],
  dnssec?: Dnssec,
): DnsHealthReport {
  const findings: DnsHealthFinding[] = [];
  const normalizedZone = zoneName.toLowerCase().replace(/\.$/, '');

  if (!dnssec || dnssec.status !== 'active') {
    findings.push({
      id: 'dnssec-disabled',
      severity: 'warning',
      title: 'DNSSEC is not active',
      description:
        'Enable DNSSEC and publish the generated DS record with the domain registrar.',
    });
  }

  const apexRecords = records.filter(
    (record) =>
      record.name.toLowerCase().replace(/\.$/, '') === normalizedZone &&
      ['A', 'AAAA', 'CNAME'].includes(record.type),
  );
  if (apexRecords.length === 0) {
    findings.push({
      id: 'missing-apex',
      severity: 'warning',
      title: 'No apex web record',
      description: `No A, AAAA, or CNAME record points ${zoneName} to a web origin. This can be intentional for non-web zones.`,
    });
  }

  const dmarcName = `_dmarc.${normalizedZone}`;
  if (
    !records.some(
      (record) =>
        record.type === 'TXT' &&
        record.name.toLowerCase().replace(/\.$/, '') === dmarcName &&
        normalizedContent(record).toLowerCase().startsWith('v=dmarc1'),
    )
  ) {
    findings.push({
      id: 'missing-dmarc',
      severity: 'info',
      title: 'No DMARC policy found',
      description:
        'Add a DMARC TXT record if this domain sends or receives email. Email-free zones can ignore this suggestion.',
    });
  }

  const spfByName = new Map<string, DnsRecord[]>();
  for (const record of records) {
    if (
      record.type === 'TXT' &&
      normalizedContent(record).toLowerCase().startsWith('v=spf1')
    ) {
      const key = record.name.toLowerCase();
      spfByName.set(key, [...(spfByName.get(key) ?? []), record]);
    }
  }
  for (const [name, spfRecords] of spfByName) {
    if (spfRecords.length > 1) {
      findings.push({
        id: `multiple-spf-${name}`,
        severity: 'critical',
        title: `Multiple SPF records at ${name}`,
        description:
          'Merge these policies into one SPF record. Multiple SPF records can cause mail authentication to fail.',
        recordIds: spfRecords.map((record) => record.id),
      });
    }
  }

  const duplicates = new Map<string, DnsRecord[]>();
  for (const record of records) {
    const key = [
      record.type,
      record.name.toLowerCase(),
      normalizedContent(record).toLowerCase(),
    ].join('|');
    duplicates.set(key, [...(duplicates.get(key) ?? []), record]);
  }
  for (const duplicateRecords of duplicates.values()) {
    if (duplicateRecords.length > 1) {
      const record = duplicateRecords[0];
      findings.push({
        id: `duplicate-${record.id}`,
        severity: 'warning',
        title: `Duplicate ${record.type} record`,
        description: `${record.name} has the same value ${duplicateRecords.length} times.`,
        recordIds: duplicateRecords.map((item) => item.id),
      });
    }
  }

  const recordsByName = new Map<string, DnsRecord[]>();
  for (const record of records) {
    const key = record.name.toLowerCase();
    recordsByName.set(key, [...(recordsByName.get(key) ?? []), record]);
  }
  for (const [name, sameNameRecords] of recordsByName) {
    if (
      sameNameRecords.some((record) => record.type === 'CNAME') &&
      sameNameRecords.some((record) => record.type !== 'CNAME')
    ) {
      findings.push({
        id: `cname-conflict-${name}`,
        severity: 'critical',
        title: `CNAME conflict at ${name}`,
        description:
          'A CNAME should not coexist with other DNS record types at the same name.',
        recordIds: sameNameRecords.map((record) => record.id),
      });
    }
  }

  const unproxiedOrigins = records.filter(
    (record) =>
      ['A', 'AAAA', 'CNAME'].includes(record.type) && record.proxied === false,
  );
  if (unproxiedOrigins.length > 0) {
    findings.push({
      id: 'unproxied-origins',
      severity: 'info',
      title: `${unproxiedOrigins.length} web-capable record${unproxiedOrigins.length === 1 ? '' : 's'} not proxied`,
      description:
        'Review whether these records intentionally bypass Cloudflare. Unproxied A and AAAA records reveal their origin addresses.',
      recordIds: unproxiedOrigins.map((record) => record.id),
    });
  }

  const penalty = findings.reduce((total, finding) => {
    if (finding.severity === 'critical') return total + 30;
    if (finding.severity === 'warning') return total + 15;
    return total + 5;
  }, 0);

  return { score: Math.max(0, 100 - penalty), findings };
}
