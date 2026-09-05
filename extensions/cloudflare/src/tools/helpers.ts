import { getCloudflareService } from '../oauth';
import type { Account, DnsRecord, Zone } from '../service';

export interface ZoneContext {
  account: Account;
  zone: Zone;
}

export async function listZoneContexts(): Promise<ZoneContext[]> {
  const accounts = await getCloudflareService().listAccounts();
  const groups = await Promise.all(
    accounts.map(async (account) =>
      (await getCloudflareService().listZones(account)).map((zone) => ({
        account,
        zone,
      })),
    ),
  );
  return groups.flat();
}

export async function resolveZone(zoneId: string): Promise<ZoneContext> {
  const context = (await listZoneContexts()).find(
    ({ zone }) => zone.id === zoneId,
  );
  if (!context) {
    throw new Error(
      'zoneId is not accessible. Call List Zones to resolve a valid zone ID.',
    );
  }
  return context;
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
