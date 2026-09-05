import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  certificateHealth,
  certificatePackHealth,
  formatBytes,
  formatPercentage,
  formatZoneSettingValue,
} from '../src/insights-utils.ts';

describe('Cloudflare insight formatting', () => {
  it('formats traffic sizes and cache ratios', () => {
    assert.equal(formatBytes(0), '0 B');
    assert.equal(formatBytes(1536), '1.5 KB');
    assert.equal(formatPercentage(750, 1000), '75%');
    assert.equal(formatPercentage(1, 0), '0%');
  });

  it('formats scalar and structured zone-setting values', () => {
    assert.equal(formatZoneSettingValue('strict'), 'strict');
    assert.equal(formatZoneSettingValue(['TLS_AES_128_GCM_SHA256']), 'TLS_AES_128_GCM_SHA256');
    assert.equal(
      formatZoneSettingValue({ enabled: true, max_age: 31536000 }),
      '{"enabled":true,"max_age":31536000}',
    );
  });

  it('flags inactive and soon-expiring certificates', () => {
    assert.equal(certificateHealth('pending_validation'), 'error');
    assert.equal(
      certificateHealth(
        'active',
        new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      ),
      'warning',
    );
    assert.equal(
      certificateHealth(
        'active',
        new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      ),
      'healthy',
    );
  });

  it('uses the least healthy certificate and earliest expiry for a pack', () => {
    const laterExpiry = new Date(
      Date.now() + 90 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const earlierExpiry = new Date(
      Date.now() + 10 * 24 * 60 * 60 * 1000,
    ).toISOString();

    assert.deepEqual(
      certificatePackHealth('active', [
        { status: 'active', expiresOn: laterExpiry },
        { status: 'active', expiresOn: earlierExpiry },
      ]),
      { health: 'warning', earliestExpiresOn: earlierExpiry },
    );
    assert.equal(
      certificatePackHealth('active', [
        { status: 'active', expiresOn: laterExpiry },
        { status: 'inactive', expiresOn: earlierExpiry },
      ]).health,
      'error',
    );
  });
});
