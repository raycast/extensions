import {
  getAuthenticatedCloudflareService,
  getCloudflareService,
} from '../oauth';
import type Service from '../service';
import type { Account, DnsRecord, Zone } from '../service';

export interface ZoneContext {
  account: Account;
  zone: Zone;
}

async function listZoneContextsWithService(
  service: Service,
): Promise<ZoneContext[]> {
  const accounts = await service.listAccounts();
  const groups = await Promise.all(
    accounts.map(async (account) =>
      (await service.listZones(account)).map((zone) => ({
        account,
        zone,
      })),
    ),
  );
  return groups.flat();
}

async function resolveZoneWithService(
  zoneId: string,
  service: Service,
): Promise<ZoneContext> {
  const context = (await listZoneContextsWithService(service)).find(
    ({ zone }) => zone.id === zoneId,
  );
  if (!context) {
    throw new Error(
      'zoneId is not accessible. Call List Zones to resolve a valid zone ID.',
    );
  }
  return context;
}

export async function listZoneContexts(): Promise<ZoneContext[]> {
  return listZoneContextsWithService(getCloudflareService());
}

export async function resolveZone(zoneId: string): Promise<ZoneContext> {
  return resolveZoneWithService(zoneId, getCloudflareService());
}

export async function resolveAuthenticatedZone(
  zoneId: string,
): Promise<ZoneContext> {
  return resolveZoneWithService(
    zoneId,
    await getAuthenticatedCloudflareService(),
  );
}

export async function resolveDnsRecord(
  zoneId: string,
  recordId: string,
): Promise<{ context: ZoneContext; record: DnsRecord }> {
  const context = await resolveZone(zoneId);
  const record = (
    await getCloudflareService().listDnsRecords(context.zone.id)
  ).find((record) => record.id === recordId);
  if (!record) {
    throw new Error(
      'recordId was not found in the selected zone. Call Find DNS Records first.',
    );
  }
  return { context, record };
}

export async function resolveAccount(accountId: string): Promise<Account> {
  const account = (await getCloudflareService().listAccounts()).find(
    (account) => account.id === accountId,
  );
  if (!account) {
    throw new Error(
      'accountId is not accessible. Call List Zones to resolve a valid account ID.',
    );
  }
  return account;
}
