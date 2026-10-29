import { Tool } from '@raycast/api';
import {
  isProxiableRecordType,
  normalizeDnsRecordContent,
  normalizeDnsRecordName,
} from '../dns-utils';
import { withCloudflareAccessToken, getCloudflareService } from '../oauth';
import type { DnsRecordUpdate } from '../service';
import { resolveDnsRecord } from './helpers';

interface Input {
  /** Zone ID returned by List Zones. */
  zoneId: string;
  /** Record ID returned by Find DNS Records. */
  recordId: string;
  /** Current record name returned by Find DNS Records, shown in the confirmation. */
  recordName: string;
  /** New owner name. Use @ for the zone apex or a relative/full hostname. */
  name?: string;
  /** New record content. */
  content?: string;
  /** New TTL in seconds, or 1 for automatic. */
  ttl?: number;
  /** Whether Cloudflare should proxy an A, AAAA, or CNAME record. */
  proxied?: boolean;
  /** New priority for an MX record. */
  priority?: number;
  /** New comment. Use an empty string to remove the current comment. */
  comment?: string;
  /** Complete replacement list of record tags. Use an empty list to remove all tags. */
  tags?: string[];
}

function changeSummary(input: Input): string {
  return [
    input.name !== undefined ? `Name: ${input.name}` : undefined,
    input.content !== undefined ? `Content: ${input.content}` : undefined,
    input.ttl !== undefined ? `TTL: ${input.ttl}` : undefined,
    input.proxied !== undefined ? `Proxied: ${input.proxied}` : undefined,
    input.priority !== undefined ? `Priority: ${input.priority}` : undefined,
    input.comment !== undefined
      ? `Comment: ${input.comment || '(remove)'}`
      : undefined,
    input.tags !== undefined
      ? `Tags: ${input.tags.join(', ') || '(remove all)'}`
      : undefined,
  ]
    .filter((value): value is string => Boolean(value))
    .join('\n');
}

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `Update ${input.recordName} in Cloudflare?`,
  info: [
    { name: 'Zone ID', value: input.zoneId },
    { name: 'Record ID', value: input.recordId },
    { name: 'Changes', value: changeSummary(input) || 'No changes provided' },
  ],
});

async function tool(input: Input) {
  const hasChanges =
    input.name !== undefined ||
    input.content !== undefined ||
    input.ttl !== undefined ||
    input.proxied !== undefined ||
    input.priority !== undefined ||
    input.comment !== undefined ||
    input.tags !== undefined;
  if (!hasChanges) throw new Error('Provide at least one field to update.');
  if (
    input.ttl !== undefined &&
    (!Number.isInteger(input.ttl) ||
      (input.ttl !== 1 && input.ttl < 30) ||
      input.ttl > 86400)
  ) {
    throw new Error(
      'ttl must be 1 for automatic or a whole number from 30 to 86400.',
    );
  }
  if (
    input.priority !== undefined &&
    (!Number.isInteger(input.priority) ||
      input.priority < 0 ||
      input.priority > 65535)
  ) {
    throw new Error('priority must be a whole number from 0 to 65535.');
  }
  if (input.comment !== undefined && input.comment.length > 100) {
    throw new Error('comment must not exceed 100 characters.');
  }

  const { context, record } = await resolveDnsRecord(
    input.zoneId,
    input.recordId,
  );
  if (record.name.toLowerCase() !== input.recordName.toLowerCase()) {
    throw new Error(
      'recordName does not match the current record. Call Find DNS Records again.',
    );
  }
  if (input.proxied !== undefined && !isProxiableRecordType(record.type)) {
    throw new Error('Only A, AAAA, and CNAME records can change proxy status.');
  }
  if (input.priority !== undefined && record.type !== 'MX') {
    throw new Error('Only MX records can change priority.');
  }

  const update: DnsRecordUpdate = {};
  if (input.name !== undefined) {
    update.name = normalizeDnsRecordName(input.name, context.zone.name);
  }
  if (input.content !== undefined) {
    update.content = normalizeDnsRecordContent(record.type, input.content);
  }
  if (input.ttl !== undefined) update.ttl = input.ttl;
  if (input.proxied !== undefined) update.proxied = input.proxied;
  if (input.priority !== undefined) update.priority = input.priority;
  if (input.comment !== undefined)
    update.comment = input.comment.trim() || null;
  if (input.tags !== undefined) {
    update.tags = Array.from(
      new Set(input.tags.map((tag) => tag.trim()).filter(Boolean)),
    );
  }

  const updated = await getCloudflareService().updateDnsRecord(
    context.zone.id,
    record.id,
    update,
  );
  return {
    updated: true,
    accountId: context.account.id,
    zoneId: context.zone.id,
    zoneName: context.zone.name,
    record: {
      id: updated.id,
      type: updated.type,
      name: updated.name,
      content: updated.content,
      ttl: updated.ttl,
      proxied: updated.proxied,
      priority: updated.priority,
      comment: updated.comment,
      tags: updated.tags,
    },
  };
}

export default withCloudflareAccessToken(tool);
