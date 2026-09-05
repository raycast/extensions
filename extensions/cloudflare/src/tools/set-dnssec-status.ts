import { Action, Tool } from '@raycast/api';
import { withCloudflareAccessToken, getCloudflareService } from '../oauth';
import { resolveZone } from './helpers';

interface Input {
  /** Zone ID returned by List Zones. */
  zoneId: string;
  /** Zone name returned by List Zones, shown in the confirmation. */
  zoneName: string;
  /** Desired DNSSEC status. */
  status: 'active' | 'disabled';
}

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  style:
    input.status === 'disabled'
      ? Action.Style.Destructive
      : Action.Style.Regular,
  message: `${input.status === 'active' ? 'Enable' : 'Disable'} DNSSEC for ${input.zoneName}?`,
  info: [
    { name: 'Zone ID', value: input.zoneId },
    {
      name: 'Registrar step',
      value:
        input.status === 'active'
          ? 'Publish the returned DS record with the domain registrar.'
          : 'Remove the DS record at the registrar first to avoid resolution failures.',
    },
  ],
});

async function tool(input: Input) {
  const context = await resolveZone(input.zoneId);
  if (context.zone.name.toLowerCase() !== input.zoneName.toLowerCase()) {
    throw new Error(
      'zoneName does not match the selected zone. Call List Zones again.',
    );
  }

  const dnssec = await getCloudflareService().setDnssecStatus(
    context.zone.id,
    input.status,
  );
  return {
    updated: true,
    accountId: context.account.id,
    zoneId: context.zone.id,
    zoneName: context.zone.name,
    status: dnssec.status,
    ds: dnssec.ds,
    digest: dnssec.digest,
    digestAlgorithm: dnssec.digestAlgorithm,
    keyTag: dnssec.keyTag,
    publicKey: dnssec.publicKey,
  };
}

export default withCloudflareAccessToken(tool);
