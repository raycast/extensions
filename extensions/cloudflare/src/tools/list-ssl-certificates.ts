import { getCloudflareService, withCloudflareAccessToken } from '../oauth';
import { certificateHealth } from '../insights-utils';
import { resolveZone } from './helpers';

interface Input {
  /** Zone ID returned by List Zones. */
  zoneId: string;
}

async function tool(input: Input) {
  const context = await resolveZone(input.zoneId);
  const packs = await getCloudflareService().listCertificatePacks(
    context.zone.id,
  );
  return {
    accountId: context.account.id,
    accountName: context.account.name,
    zoneId: context.zone.id,
    zoneName: context.zone.name,
    certificatePacks: packs.map((pack) => ({
      id: pack.id,
      hosts: pack.hosts,
      status: pack.status,
      health: certificateHealth(pack.status, pack.certificates[0]?.expiresOn),
      type: pack.type,
      certificateAuthority:
        pack.certificates[0]?.issuer ?? pack.certificateAuthority,
      validationMethod: pack.validationMethod,
      validationErrors: pack.validationErrors,
      certificates: pack.certificates.map((certificate) => ({
        id: certificate.id,
        hosts: certificate.hosts,
        status: certificate.status,
        expiresOn: certificate.expiresOn,
        issuer: certificate.issuer,
        signature: certificate.signature,
      })),
    })),
  };
}

export default withCloudflareAccessToken(tool);
