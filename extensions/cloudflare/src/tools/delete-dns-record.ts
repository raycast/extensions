import { Action, Tool } from '@raycast/api';
import { withCloudflareAccessToken, getCloudflareService } from '../oauth';
import { resolveDnsRecord } from './helpers';

interface Input {
  /** Zone ID returned by List Zones. */
  zoneId: string;
  /** Record ID returned by Find DNS Records. */
  recordId: string;
  /** Current record name returned by Find DNS Records, shown in the confirmation. */
  recordName: string;
}

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  style: Action.Style.Destructive,
  message: `Permanently delete ${input.recordName} from Cloudflare?`,
  info: [
    { name: 'Zone ID', value: input.zoneId },
    { name: 'Record ID', value: input.recordId },
  ],
});

async function tool(input: Input) {
  const { context, record } = await resolveDnsRecord(
    input.zoneId,
    input.recordId,
  );
  if (record.name.toLowerCase() !== input.recordName.toLowerCase()) {
    throw new Error(
      'recordName does not match the current record. Call Find DNS Records again.',
    );
  }

  const result = await getCloudflareService().deleteDnsRecord(
    context.zone.id,
    record.id,
  );
  return {
    deleted: true,
    accountId: context.account.id,
    zoneId: context.zone.id,
    zoneName: context.zone.name,
    record: {
      id: result.id,
      type: record.type,
      name: record.name,
      content: record.content,
    },
  };
}

export default withCloudflareAccessToken(tool);
