import { Action, Tool } from '@raycast/api';
import { withCloudflareAccessToken, getCloudflareService } from '../oauth';
import {
  buildPurgeConfirmationDetails,
  selectedPurgeModes,
} from '../tool-confirmations';
import { resolveAuthenticatedZone, resolveZone } from './helpers';

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

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const context = await resolveAuthenticatedZone(input.zoneId);
  const modes = selectedPurgeModes(input);
  return {
    style: modes.length === 0 ? Action.Style.Destructive : Action.Style.Regular,
    ...buildPurgeConfirmationDetails(input, context.zone.name),
  };
};

async function tool(input: Input) {
  const modes = selectedPurgeModes(input);
  if (modes.length > 1) {
    throw new Error(
      'Provide only one of urls, hosts, tags, or prefixes per purge request.',
    );
  }

  const context = await resolveZone(input.zoneId);

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
