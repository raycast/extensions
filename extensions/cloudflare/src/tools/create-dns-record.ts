import { Tool } from '@raycast/api';
import {
  isProxiableRecordType,
  normalizeDnsRecordContent,
  normalizeDnsRecordName,
} from '../dns-utils';
import { withCloudflareAccessToken, getCloudflareService } from '../oauth';

interface Input {
  /** Zone ID returned by List Zones. */
  zoneId: string;
  /** DNS record type. */
  type: 'A' | 'AAAA' | 'CAA' | 'CNAME' | 'MX' | 'NS' | 'SRV' | 'TXT';
  /** Record name. Use @ for the zone apex or a relative/full hostname. */
  name: string;
  /** DNS record content. */
  content: string;
  /** TTL in seconds, or 1 for automatic. Defaults to 1. */
  ttl?: number;
  /** Whether Cloudflare should proxy A, AAAA, or CNAME traffic. */
  proxied?: boolean;
  /** Priority for MX records. */
  priority?: number;
  /** Optional record comment, at most 100 characters. */
  comment?: string;
}

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: 'Create this Cloudflare DNS record?',
  info: [
    { name: 'Zone ID', value: input.zoneId },
    { name: 'Record', value: `${input.type} ${input.name}` },
    { name: 'Content', value: input.content },
    { name: 'TTL', value: String(input.ttl ?? 1) },
    {
      name: 'Proxied',
      value: input.proxied === undefined ? undefined : String(input.proxied),
    },
  ],
});

async function tool(input: Input) {
  const ttl = input.ttl ?? 1;
  if (!Number.isInteger(ttl) || (ttl !== 1 && ttl < 30) || ttl > 86400) {
    throw new Error(
      'ttl must be 1 for automatic or a whole number from 30 to 86400.',
    );
  }
  if (input.comment && input.comment.length > 100) {
    throw new Error('comment must not exceed 100 characters.');
  }
  if (input.type === 'MX' && input.priority === undefined) {
    throw new Error('priority is required for MX records.');
  }

  const accounts = await getCloudflareService().listAccounts();
  const zoneGroups = await Promise.all(
    accounts.map(async (account) => getCloudflareService().listZones(account)),
  );
  const zone = zoneGroups.flat().find((zone) => zone.id === input.zoneId);
  if (!zone)
    throw new Error('zoneId is not accessible. Call List Zones first.');

  const record = await getCloudflareService().createDnsRecord(zone.id, {
    type: input.type,
    name: normalizeDnsRecordName(input.name, zone.name),
    content: normalizeDnsRecordContent(input.type, input.content),
    ttl,
    proxied: isProxiableRecordType(input.type) ? input.proxied : undefined,
    priority: input.type === 'MX' ? input.priority : undefined,
    comment: input.comment?.trim() || undefined,
  });
  return {
    created: true,
    zoneId: zone.id,
    zoneName: zone.name,
    record: {
      id: record.id,
      type: record.type,
      name: record.name,
      content: record.content,
      ttl: record.ttl,
      proxied: record.proxied,
      priority: record.priority,
    },
  };
}

export default withCloudflareAccessToken(tool);
