import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  dnsRecordToCreate,
  normalizeDnsRecordContent,
  normalizeDnsRecordName,
} from '../src/dns-utils.ts';

describe('DNS record normalization', () => {
  it('expands apex and relative record names', () => {
    assert.equal(normalizeDnsRecordName('@', 'example.com'), 'example.com');
    assert.equal(
      normalizeDnsRecordName('www', 'example.com'),
      'www.example.com',
    );
    assert.equal(
      normalizeDnsRecordName('api.example.com.', 'example.com'),
      'api.example.com',
    );
  });

  it('quotes TXT content exactly once', () => {
    assert.equal(
      normalizeDnsRecordContent('TXT', 'v=spf1 -all'),
      '"v=spf1 -all"',
    );
    assert.equal(
      normalizeDnsRecordContent('TXT', '"v=spf1 -all"'),
      '"v=spf1 -all"',
    );
    assert.equal(
      normalizeDnsRecordContent('A', ' 192.0.2.1 '),
      '192.0.2.1',
    );
  });

  it('rewrites copied record owners to the destination zone', () => {
    const source = {
      id: 'record-1',
      type: 'CNAME',
      name: 'www.example.com',
      content: 'target.example.net',
      ttl: 1,
      proxied: true,
      tags: ['team=web'],
    };

    const copied = dnsRecordToCreate(source, 'example.com', 'example.org');
    assert.equal(copied.name, 'www.example.org');
    assert.equal(copied.content, 'target.example.net');
    assert.deepEqual(copied.tags, ['team=web']);
  });
});
