import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { collectPaginatedItems } from '../src/pagination.ts';
import { ensureServiceInitialized } from '../src/service-initialization.ts';
import {
  buildCreateDnsConfirmationDetails,
  buildPurgeConfirmationDetails,
} from '../src/tool-confirmations.ts';

describe('destructive tool confirmations', () => {
  it('identifies the resolved zone for whole-zone cache purges', () => {
    const confirmation = buildPurgeConfirmationDetails(
      { zoneId: 'zone-123' },
      'example.com',
    );

    assert.equal(confirmation.message, 'Purge everything cached for example.com?');
    assert.deepEqual(confirmation.info.slice(0, 2), [
      { name: 'Zone', value: 'example.com' },
      { name: 'Zone ID', value: 'zone-123' },
    ]);
  });

  it('identifies the resolved zone and full record name for DNS creation', () => {
    const confirmation = buildCreateDnsConfirmationDetails(
      {
        zoneId: 'zone-123',
        type: 'A',
        name: 'api',
        content: '192.0.2.1',
      },
      'example.com',
      'api.example.com',
    );

    assert.equal(
      confirmation.message,
      'Create this Cloudflare DNS record in example.com?',
    );
    assert.deepEqual(confirmation.info.slice(0, 3), [
      { name: 'Zone', value: 'example.com' },
      { name: 'Zone ID', value: 'zone-123' },
      { name: 'Record', value: 'A api.example.com' },
    ]);
  });
});

describe('confirmation authentication', () => {
  it('reuses an already initialized service', async () => {
    const existingService = { accessToken: 'existing-token' };
    const service = await ensureServiceInitialized({
      currentService: existingService,
      authorize: async () => {
        throw new Error('OAuth should not run');
      },
      initialize: () => {
        throw new Error('Service should not be reinitialized');
      },
    });

    assert.equal(service, existingService);
  });

  it('authorizes and initializes a cold service before confirmation lookups', async () => {
    const calls = [];
    const service = await ensureServiceInitialized({
      currentService: undefined,
      authorize: async () => {
        calls.push('authorize');
        return 'oauth-token';
      },
      initialize: (accessToken) => {
        calls.push(`initialize:${accessToken}`);
        return { accessToken };
      },
    });

    assert.deepEqual(calls, ['authorize', 'initialize:oauth-token']);
    assert.deepEqual(service, { accessToken: 'oauth-token' });
  });

  it('initializes from a personal token without starting OAuth', async () => {
    const service = await ensureServiceInitialized({
      currentService: undefined,
      personalAccessToken: 'personal-token',
      authorize: async () => {
        throw new Error('OAuth should not run');
      },
      initialize: (accessToken) => ({ accessToken }),
    });

    assert.deepEqual(service, { accessToken: 'personal-token' });
  });
});

describe('paginated Cloudflare resources', () => {
  it('collects every page of Worker versions', async () => {
    const requestedPages = [];
    const items = await collectPaginatedItems(async (page) => {
      requestedPages.push(page);
      return {
        items: [`version-${page}`],
        totalPages: 3,
      };
    });

    assert.deepEqual(requestedPages, [1, 2, 3]);
    assert.deepEqual(items, ['version-1', 'version-2', 'version-3']);
  });
});
