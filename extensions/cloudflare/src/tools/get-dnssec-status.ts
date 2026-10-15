import { withCloudflareAccessToken, getCloudflareService } from '../oauth';
import { resolveZone } from './helpers';

interface Input {
  /** Zone ID returned by List Zones. */
  zoneId: string;
}

async function tool(input: Input) {
  const context = await resolveZone(input.zoneId);
  const dnssec = await getCloudflareService().getDnssec(context.zone.id);
  return {
    accountId: context.account.id,
    accountName: context.account.name,
    zoneId: context.zone.id,
    zoneName: context.zone.name,
    status: dnssec.status,
    modifiedOn: dnssec.modifiedOn,
    ds: dnssec.ds,
    algorithm: dnssec.algorithm,
    digest: dnssec.digest,
    digestAlgorithm: dnssec.digestAlgorithm,
    digestType: dnssec.digestType,
    flags: dnssec.flags,
    keyTag: dnssec.keyTag,
    keyType: dnssec.keyType,
    publicKey: dnssec.publicKey,
  };
}

export default withCloudflareAccessToken(tool);
