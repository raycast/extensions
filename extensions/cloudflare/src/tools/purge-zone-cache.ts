import { Action, Tool } from '@raycast/api';
import { withCloudflareAccessToken, getCloudflareService } from '../oauth';

interface Input {
  /** Zone ID returned by List Zones. */
  zoneId: string;
  /** Exact URLs to purge. */
  urls?: string[];
  /** Hostnames to purge. */
  hosts?: string[];
  /** Cache tags to purge. */
  tags?: string[];
  /** URL prefixes to purge. */
  prefixes?: string[];
}

function selectedMode(input: Input) {
  const modes = [
    input.urls?.length ? 'URLs' : undefined,
    input.hosts?.length ? 'hostnames' : undefined,
    input.tags?.length ? 'tags' : undefined,
    input.prefixes?.length ? 'prefixes' : undefined,
  ].filter((value): value is string => Boolean(value));
  return modes;
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const modes = selectedMode(input);
  return {
    style: modes.length === 0 ? Action.Style.Destructive : Action.Style.Regular,
    message:
      modes.length === 0
        ? 'Purge everything cached for this Cloudflare zone?'
        : `Purge cached content matching ${modes.join(', ')}?`,
    info: [
      { name: 'Zone ID', value: input.zoneId },
      { name: 'URLs', value: input.urls?.join('\n') },
      { name: 'Hostnames', value: input.hosts?.join('\n') },
      { name: 'Tags', value: input.tags?.join(', ') },
      { name: 'Prefixes', value: input.prefixes?.join('\n') },
    ],
  };
};

async function tool(input: Input) {
  const modes = selectedMode(input);
  if (modes.length > 1) {
    throw new Error(
      'Provide only one of urls, hosts, tags, or prefixes per purge request.',
    );
  }

  const accounts = await getCloudflareService().listAccounts();
  const zoneGroups = await Promise.all(
    accounts.map(async (account) =>
      (await getCloudflareService().listZones(account)).map((zone) => ({
        account,
        zone,
      })),
    ),
  );
  const context = zoneGroups
    .flat()
    .find(({ zone }) => zone.id === input.zoneId);
  if (!context) {
    throw new Error(
      'zoneId is not accessible. Call List Zones to resolve a valid zone ID.',
    );
  }

  let result;
  if (input.urls?.length) {
    result = await getCloudflareService().purgeFilesbyURL(
      input.zoneId,
      input.urls,
    );
  } else if (input.hosts?.length) {
    result = await getCloudflareService().purgeByHostnames(
      input.zoneId,
      input.hosts,
    );
  } else if (input.tags?.length) {
    result = await getCloudflareService().purgeByTags(input.zoneId, input.tags);
  } else if (input.prefixes?.length) {
    result = await getCloudflareService().purgeByPrefixes(
      input.zoneId,
      input.prefixes,
    );
  } else {
    result = await getCloudflareService().purgeEverything(input.zoneId);
  }
  return {
    success: result.success,
    zoneId: input.zoneId,
    zoneName: context.zone.name,
    mode: modes[0] ?? 'everything',
    purgeId: result.result.id,
    errors: result.errors.map((error) => ({
      code: error.code,
      message: error.message,
    })),
  };
}

export default withCloudflareAccessToken(tool);
