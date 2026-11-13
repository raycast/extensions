export interface PurgeConfirmationInput {
  zoneId: string;
  urls?: string[];
  hosts?: string[];
  tags?: string[];
  prefixes?: string[];
}

export interface CreateDnsConfirmationInput {
  zoneId: string;
  type: string;
  name: string;
  content: string;
  ttl?: number;
  proxied?: boolean;
}

export function selectedPurgeModes(input: PurgeConfirmationInput): string[] {
  return [
    input.urls?.length ? 'URLs' : undefined,
    input.hosts?.length ? 'hostnames' : undefined,
    input.tags?.length ? 'tags' : undefined,
    input.prefixes?.length ? 'prefixes' : undefined,
  ].filter((value): value is string => Boolean(value));
}

export function buildPurgeConfirmationDetails(
  input: PurgeConfirmationInput,
  zoneName: string,
) {
  const modes = selectedPurgeModes(input);
  return {
    message:
      modes.length === 0
        ? `Purge everything cached for ${zoneName}?`
        : `Purge cached content matching ${modes.join(', ')} for ${zoneName}?`,
    info: [
      { name: 'Zone', value: zoneName },
      { name: 'Zone ID', value: input.zoneId },
      { name: 'URLs', value: input.urls?.join('\n') },
      { name: 'Hostnames', value: input.hosts?.join('\n') },
      { name: 'Tags', value: input.tags?.join(', ') },
      { name: 'Prefixes', value: input.prefixes?.join('\n') },
    ],
  };
}

export function buildCreateDnsConfirmationDetails(
  input: CreateDnsConfirmationInput,
  zoneName: string,
  recordName: string,
) {
  return {
    message: `Create this Cloudflare DNS record in ${zoneName}?`,
    info: [
      { name: 'Zone', value: zoneName },
      { name: 'Zone ID', value: input.zoneId },
      {
        name: 'Record',
        value: `${input.type} ${recordName}`,
      },
      { name: 'Content', value: input.content },
      { name: 'TTL', value: String(input.ttl ?? 1) },
      {
        name: 'Proxied',
        value: input.proxied === undefined ? undefined : String(input.proxied),
      },
    ],
  };
}
