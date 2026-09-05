import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { analyzeDnsHealth } from '../src/dns-health.ts';

const activeDnssec = { status: 'active' };

function record(overrides = {}) {
  return {
    id: 'record-1',
    name: 'example.com',
    type: 'A',
    content: '192.0.2.1',
    ttl: 1,
    proxied: true,
    tags: [],
    ...overrides,
  };
}

describe('analyzeDnsHealth', () => {
  it('returns a clean report for a minimal protected web and mail zone', () => {
    const report = analyzeDnsHealth(
      'example.com',
      [
        record(),
        record({
          id: 'dmarc',
          name: '_dmarc.example.com',
          type: 'TXT',
          content: '"v=DMARC1; p=reject"',
          proxied: undefined,
        }),
      ],
      activeDnssec,
    );

    assert.deepEqual(report, { score: 100, findings: [] });
  });

  it('detects duplicate SPF policies at the same name', () => {
    const records = [
      record(),
      record({
        id: 'spf-1',
        type: 'TXT',
        content: '"v=spf1 include:_spf.example.com -all"',
        proxied: undefined,
      }),
      record({
        id: 'spf-2',
        type: 'TXT',
        content: 'v=spf1 include:mail.example.com -all',
        proxied: undefined,
      }),
    ];

    const report = analyzeDnsHealth('example.com', records, activeDnssec);
    const finding = report.findings.find(
      (candidate) => candidate.title === 'Multiple SPF records at example.com',
    );

    assert.deepEqual(finding, {
      id: 'multiple-spf-example.com',
      severity: 'critical',
      title: 'Multiple SPF records at example.com',
      description:
        'Merge these policies into one SPF record. Multiple SPF records can cause mail authentication to fail.',
      recordIds: ['spf-1', 'spf-2'],
    });
  });

  it('reports DNSSEC and unproxied-origin concerns without claiming failure', () => {
    const report = analyzeDnsHealth(
      'example.com',
      [record({ proxied: false })],
      { status: 'disabled' },
    );

    const findingIds = report.findings.map((finding) => finding.id);
    assert.ok(findingIds.includes('dnssec-disabled'));
    assert.ok(findingIds.includes('unproxied-origins'));
    assert.ok(report.score < 100);
  });
});
